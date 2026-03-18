import os
from app import create_app

app = create_app()
client = app.test_client()

email = os.environ.get('LOGIN_EMAIL')
password = os.environ.get('LOGIN_PASSWORD')

resp = client.post('/api/login', json={'email': email, 'password': password})
print('status:', resp.status_code)
try:
    print(resp.get_json())
except Exception:
    print(resp.get_data(as_text=True))
