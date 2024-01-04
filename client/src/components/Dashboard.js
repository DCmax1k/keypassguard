import React, { Component } from 'react';

// TESTING SITE PLACEHOLDER
const testSite = {};

class Dashboard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user: null,
            loggedIn: false,
            loadingText: 'Loggin in...',
            fadeOut: false,
        };
    }

    async componentDidMount() {
        try {
            //const checkLogin = await sendData('/auth', {});
            const checkLogin = {user: {username: 'DCmax1k', plus: false, sites: [testSite], settings: {}, email: 'dylan@digitalcaldwell.com', },status: 'success',};
            if (checkLogin.status === 'success') {
                const user = checkLogin.user;
                this.setState({
                    user,
                    budgets: user.budgets,
                    loadingText: 'Welcome back, ' + user.username + '!',
                });
                setTimeout(() => {
                    this.setState({
                        fadeOut: true,
                    });
                    setTimeout(() => {
                        this.setState({
                            loggedIn: true,
                        });
                    }, 300);
                }, 600);
            } else {
                this.setState({
                    loadingText: checkLogin.message,
                });
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }

        } catch(err) {
            console.error(err);
        }
    }

    render() {
        return this.state.loggedIn ? (
            <div className='Dashboard'>
                <div className='body'>
                    <img src='/images/logo.svg' alt='Keypass Guard' />
                    <h3>{this.state.user.sites.length} site key{this.state.user.sites.length === 1 ? '':'s'} secure</h3>

                </div>
            </div>
        ) : (
            <div className={`Loading ${this.state.loggedIn} ${this.state.fadeOut ? 'fadeOut' : ''}`}>
                {/* <img className='loading' src='/images/loading.svg' alt='loading' /> */}
                {this.state.loadingText}
            </div>
        );
    }
}

export default Dashboard;