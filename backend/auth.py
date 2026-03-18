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

	# Check staff collection first, then users collection
	staff = get_collection('staff')
	user = staff.find_one({'email': email})
	if not user:
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


@auth_bp.route('/verify-token', methods=['GET'])
def verify_token():
	"""Verify if the provided JWT token is valid."""
	auth = request.headers.get('Authorization', '')
	if not auth.startswith('Bearer '):
		return jsonify({'error': 'missing token', 'valid': False}), 401
	
	token = auth.split(None, 1)[1]
	secret = os.environ.get('SECRET_KEY', current_app.config.get('SECRET_KEY', 'dev-secret'))
	
	try:
		payload = jwt.decode(token, secret, algorithms=['HS256'])
		return jsonify({
			'valid': True,
			'email': payload.get('email'),
			'sub': payload.get('sub'),
			'exp': payload.get('exp')
		})
	except ExpiredSignatureError:
		return jsonify({'error': 'token expired', 'valid': False}), 401
	except InvalidTokenError:
		return jsonify({'error': 'invalid token', 'valid': False}), 401

@auth_bp.route('/change-password', methods=['POST'])
def change_password():
	"""Change password for authenticated user."""
	# Get current user from token
	auth = request.headers.get('Authorization', '')
	if not auth.startswith('Bearer '):
		return jsonify({'error': 'missing token'}), 401
	token = auth.split(None, 1)[1]
	secret = os.environ.get('SECRET_KEY', current_app.config.get('SECRET_KEY', 'dev-secret'))
	
	try:
		payload = jwt.decode(token, secret, algorithms=['HS256'])
	except (ExpiredSignatureError, InvalidTokenError):
		return jsonify({'error': 'invalid token'}), 401

	data = request.get_json() or {}
	current_password = data.get('currentPassword')
	new_password = data.get('newPassword')

	if not current_password or not new_password:
		return jsonify({'error': 'current and new password required'}), 400

	# Find user in staff or users collection
	email = payload.get('email')
	staff = get_collection('staff')
	user = staff.find_one({'email': email})
	collection = staff

	if not user:
		users = users_collection()
		user = users.find_one({'email': email})
		collection = users

	if not user:
		return jsonify({'error': 'user not found'}), 404

	# Verify current password
	if not check_password_hash(user.get('password', ''), current_password):
		return jsonify({'error': 'current password is incorrect'}), 401

	# Update password
	new_hash = generate_password_hash(new_password)
	collection.update_one(
		{'email': email},
		{'$set': {'password': new_hash}}
	)

	return jsonify({'message': 'password updated successfully'})

