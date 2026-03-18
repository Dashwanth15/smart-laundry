from flask import Flask
from auth import auth_bp
from batches import batches_bp
from db import init_db
from dotenv import load_dotenv
from flask_cors import CORS
import os
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


load_dotenv()  # read .env file if present


def create_app():
	app = Flask(__name__)
	app.config.from_mapping(
		SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-secret'),
		TOKEN_EXPIRES_SECONDS=int(os.environ.get('TOKEN_EXPIRES_SECONDS', 3600)),
	)

	# Restrict CORS to a single frontend origin (default localhost:3000)
	# FRONTEND_ORIGIN can be:
	# - a single origin (e.g. "http://localhost:3000")
	# - a comma-separated list (e.g. "http://localhost:3000,http://localhost:3001")
	# - a star '*' to allow all origins (not recommended for production)
	frontend_env = os.environ.get('FRONTEND_ORIGIN', 'http://localhost:3000')
	if frontend_env.strip() == '*':
		origins = '*'
	else:
		# split comma-separated origins and strip whitespace
		origins = [o.strip() for o in frontend_env.split(',') if o.strip()]

	# Only apply CORS to /api/* routes
	CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True)

	# Initialize Flask-Limiter
	limiter = Limiter(
		get_remote_address,
		app=app,
		default_limits=["200 per day", "50 per hour"],
		storage_uri="memory://", # In-memory storage for simplicity
		strategy="fixed-window" # or "moving-window"
	)
	app.config["LIMITER_ENABLED"] = True # Enable limiter

	init_db(app)
	app.register_blueprint(auth_bp, url_prefix='/api')
	app.register_blueprint(batches_bp, url_prefix='/api')
	return app


if __name__ == '__main__':
	app = create_app()
	# Run without the debugger/reloader on Windows to avoid socket/select issues
	app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
	
