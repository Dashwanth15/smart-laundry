from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from db import users_collection, get_collection
import jwt
import os
import datetime
from pymongo.errors import DuplicateKeyError
from jwt import ExpiredSignatureError, InvalidTokenError


auth_bp = Blueprint('auth', __name__)


def _make_token(payload: dict):
	secret = os.environ.get('SECRET_KEY', current_app.config.get('SECRET_KEY', 'dev-secret'))
	return jwt.encode(payload, secret, algorithm='HS256')


@auth_bp.route('/register', methods=['POST'])
def register():
	data = request.get_json() or {}
	email = data.get('email')
	password = data.get('password')
	name = data.get('name')

	if not email or not password:
		return jsonify({'error': 'email and password required'}), 400

	users = users_collection()
	hashed = generate_password_hash(password)
	try:
		res = users.insert_one({'email': email, 'password': hashed, 'name': name})
	except DuplicateKeyError:
		return jsonify({'error': 'email already registered'}), 400
	# for pymongo result or in-memory result
	inserted = getattr(res, 'inserted_id', None)
	return jsonify({'id': str(inserted)}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
	data = request.get_json() or {}
	email = data.get('email')
	password = data.get('password')

	if not email or not password:
		return jsonify({'error': 'email and password required'}), 400

	# Authenticate first against staff collection (your requested collection)
	staff = get_collection('staff')
	user = staff.find_one({'email': email})
	# fallback to users collection if not a staff account
	if not user:
		users = users_collection()
		user = users.find_one({'email': email})
	# Check credentials
	stored_pw = user.get('password') if user else None
	match = False
	if user and stored_pw:
		try:
			match = check_password_hash(stored_pw, password)
		except Exception:
			match = False

	# Logging for debugging (safe: do not log actual password value)
	if not match:
		found = bool(user)
		pw_present = bool(stored_pw)
		# heuristic whether password looks like a werkzeug hash (pbkdf2:...) or other
		looks_hashed = False
		if pw_present and isinstance(stored_pw, str):
			looks_hashed = stored_pw.startswith('pbkdf2:') or ':' in stored_pw and '$' in stored_pw
		current_app.logger.debug(f"login failed for email={email!s} found={found} pw_present={pw_present} looks_hashed={looks_hashed}")
		return jsonify({'error': 'invalid credentials'}), 401

	payload = {
		'sub': str(user.get('_id')),
		'email': user.get('email'),
		'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=current_app.config.get('TOKEN_EXPIRES_SECONDS', 3600))
	}
	token = _make_token(payload)
	return jsonify({'token': token})



@auth_bp.route('/me', methods=['GET'])
def me():
	"""Return current user's profile based on Bearer JWT in Authorization header."""
	auth = request.headers.get('Authorization', '')
	if not auth.startswith('Bearer '):
		return jsonify({'error': 'missing token'}), 401
	token = auth.split(None, 1)[1]
	secret = os.environ.get('SECRET_KEY', current_app.config.get('SECRET_KEY', 'dev-secret'))
	try:
		payload = jwt.decode(token, secret, algorithms=['HS256'])
	except ExpiredSignatureError:
		return jsonify({'error': 'token expired'}), 401
	except InvalidTokenError:
		return jsonify({'error': 'invalid token'}), 401

	# payload contains email (we stored it on login), find user by email
	email = payload.get('email')
	if not email:
		return jsonify({'error': 'invalid token payload'}), 401

	users = users_collection()
	user = users.find_one({'email': email})
	if not user:
		return jsonify({'error': 'user not found'}), 404

	# hide sensitive fields
	profile = {
		'id': str(user.get('_id')),
		'email': user.get('email'),
		'name': user.get('name')
	}
	return jsonify(profile)

