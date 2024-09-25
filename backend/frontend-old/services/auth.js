function login(email, password) {
    fetch('/api/users/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    })
        .then(response => response.json())
        .then(data => {
            console.log('Login response:', data);
            if (data.message) {
                alert(data.message);
                redirectIfLoggedIn();
            }   
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred during login');
        });
}

function signUp(email, password) {
    fetch('/api/users/sign-up', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    })
}

function redirectIfLoggedIn() {
    console.log('redirectIfLoggedIn');
    getUser().then(data => {
        if (data.success && data.user && data.user.email) {
            window.location.href = '/rooms.html';
            console.log('redirecting to rooms.html');
        }
    });
}

function getUser() {
    return fetch('/api/users/get-user', {
        method: 'GET',
    }).then(response => response.json().user);
}

function getSession() {
    return fetch('/api/users/get-session', {
        method: 'GET',
    }).then(response => response.json());
}

