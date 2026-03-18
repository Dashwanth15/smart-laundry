from app import create_app

app = create_app()
client = app.test_client()

# Try to login
response = client.post('/api/login', json={
    'email': 'xyz@test.com',
    'password': '3o6Bh73FzPQjBlS2'  # This is the last generated password
})

print('Status:', response.status_code)
try:
    print('Response:', response.get_json())
except:
    print('Raw response:', response.get_data(as_text=True))
