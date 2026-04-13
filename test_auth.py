import pytest
from unittest.mock import patch
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_forgot_password_missing_email(client):
    response = client.post('/api/auth/forgot-password', json={})
    assert response.status_code == 400

    data = response.get_json()
    assert data['success'] is False
    assert data['message'] == 'Email is required'

def test_forgot_password_success(client):
    with patch('app.send_password_reset_email') as mock_reset:
        mock_reset.return_value = {
            'success': True,
            'message': 'Password reset email sent'
        }

        response = client.post('/api/auth/forgot-password', json={
            'email': 'test@example.com'
        })

        assert response.status_code == 200

        data = response.get_json()
        assert data['success'] is True
        assert data['message'] == 'Password reset email sent'

def test_forgot_password_failure(client):
    with patch('app.send_password_reset_email') as mock_reset:
        mock_reset.return_value = {
            'success': False,
            'message': 'EMAIL_NOT_FOUND'
        }

        response = client.post('/api/auth/forgot-password', json={
            'email': 'missing@example.com'
        })

        assert response.status_code == 400

        data = response.get_json()
        assert data['success'] is False
        assert data['message'] == 'EMAIL_NOT_FOUND'