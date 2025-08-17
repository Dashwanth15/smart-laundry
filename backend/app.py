from flask import Flask
from auth import auth_bp
from db import init_db
from dotenv import load_dotenv
from flask_cors import CORS
import os


load_dotenv()  # read .env file if present


def create_app():
	app = Flask(__name__)
	app.config.from_mapping(
		SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-secret'),
		TOKEN_EXPIRES_SECONDS=int(os.environ.get('TOKEN_EXPIRES_SECONDS', 3600)),
	)

	# Restrict CORS to a single frontend origin (default localhost:3000)
	frontend = os.environ.get('FRONTEND_ORIGIN', 'http://localhost:3000')
	CORS(app, resources={r"/api/*": {"origins": frontend}})

	init_db(app)
	app.register_blueprint(auth_bp, url_prefix='/api')
	return app


if __name__ == '__main__':
	app = create_app()
	# Run without the debugger/reloader on Windows to avoid socket/select issues
	app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

