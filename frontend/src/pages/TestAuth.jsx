import React, { useState, useEffect } from 'react';

const TestAuth = () => {
    const [authInfo, setAuthInfo] = useState({});

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        setAuthInfo({
            hasToken: !!token,
            hasUser: !!user,
            token: token ? token.substring(0, 20) + '...' : null,
            user: user ? JSON.parse(user) : null
        });
    }, []);

    const clearAuth = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    };

    return (
        <div className="container mt-5">
            <h2>Test Authentication</h2>
            <div className="card">
                <div className="card-body">
                    <h5>Authentication Status:</h5>
                    <p><strong>Has Token:</strong> {authInfo.hasToken ? 'Yes' : 'No'}</p>
                    <p><strong>Has User:</strong> {authInfo.hasUser ? 'Yes' : 'No'}</p>
                    {authInfo.token && <p><strong>Token:</strong> {authInfo.token}</p>}
                    {authInfo.user && (
                        <div>
                            <p><strong>User ID:</strong> {authInfo.user.id}</p>
                            <p><strong>Email:</strong> {authInfo.user.email}</p>
                            <p><strong>Role:</strong> {authInfo.user.role?.name || 'No role'}</p>
                        </div>
                    )}
                    <button className="btn btn-danger" onClick={clearAuth}>
                        Clear Authentication
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestAuth;
