import threading
import time
import requests
import app


def run_server():
	a = app.create_app()
	# Disable reloader when starting server in a thread for tests
	a.run(port=5001, debug=False, use_reloader=False)


def test_register_login_me():
	t = threading.Thread(target=run_server, daemon=True)
	t.start()
	time.sleep(1)

	import uuid
	unique_email = f"test+{uuid.uuid4().hex}@example.com"

	base = 'http://127.0.0.1:5001/api'
	r = requests.post(base + '/register', json={'email': unique_email, 'password': 'pass', 'name': 'Test'})
	assert r.status_code == 201, r.text
	r = requests.post(base + '/login', json={'email': unique_email, 'password': 'pass'})
	assert r.status_code == 200, r.text
	data = r.json()
	assert 'token' in data

	token = data['token']
	r = requests.get(base + '/me', headers={'Authorization': 'Bearer ' + token})
	assert r.status_code == 200, r.text
	profile = r.json()
	assert profile.get('email') == unique_email


if __name__ == '__main__':
	test_register_login_me()
	print('smoke passed')

