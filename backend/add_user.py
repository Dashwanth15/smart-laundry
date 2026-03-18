from app import create_app
import secrets
import json

app = create_app()
client = app.test_client()

email = 'xyz@test.com'
password = secrets.token_urlsafe(12)
name = 'Test User'

resp = client.post('/api/register', json={'email': email, 'password': password, 'name': name})
print('status:', resp.status_code)
try:
    print(resp.get_json())
except Exception:
    print(resp.get_data(as_text=True))
print('generated_password:', password) 
