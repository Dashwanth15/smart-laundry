from app import create_app

app = create_app()
client = app.test_client()

email = 'rudransh2310@gmail.com'
password = 'yVsU_TKeEi788xI0'

resp = client.post('/api/login', json={'email': email, 'password': password})
print('status:', resp.status_code)
try:
    print(resp.get_json())
except Exception:
    print(resp.get_data(as_text=True))
