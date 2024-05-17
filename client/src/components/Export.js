import React, { Component } from 'react';
import sendData from './util/sendData';

// TESTING SITE PLACEHOLDER
const sites = [];
for (let i = 0; i<50; i++) {
    const id = Math.random()+Date.now();
    const site = {id, name: 'Keypassguard', username: 'Dcmax1k', password: 'password1234!', note: 'This is a test note for the notes section of the stuff asdnf asdf asdfl;kasjdf asdf asdfla;sjdf'.split('').splice(0, Math.floor(Math.random() * 50)).join('')}
    sites.push(site);
}

class Export extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            loadingText: 'Answer the prompts...',
            user: {},

            data: {},
            auth: false,

            // auth: true,
            // data: {
            //     date: Date.now(),
            //     sites,
            // },
            
         };

         this.verifyAuth = this.verifyAuth.bind(this);
         this.componentDidMount = this.componentDidMount.bind(this);
         this.check2fa = this.check2fa.bind(this);
         this.send2fa = this.send2fa.bind(this);
    }

    async componentDidMount() {
        try {
            const checkLogin = await sendData('/auth', {});
            //const checkLogin = {user: {username: 'DCmax1k', plus: false, sites, settings: {emailVerified: false,}, email: 'dylan@digitalcaldwell.com', },status: 'success',};
            if (checkLogin.status === 'success') {
                const user = checkLogin.user;
                console.log(user);
                this.setState({
                    user,
                });
                this.verifyAuth(user);
            } else {
                window.location.href = '/';
            }

        } catch(err) {
            console.error(err);
        }
    }

    async verifyAuth(user) {
        console.log('user state', this.state.user);
        const input = window.prompt('Please enter the password for ' + user.username);
        const checkAuth = await sendData('/dashboard/checkpass', {auth: input});
        if (checkAuth.status === 'success') {
            this.send2fa();
        } else {
            alert("Incorrect Pass");
            this.verifyAuth(user);
        }
    }

    async send2fa() {
        const send2fa = await sendData('/dashboard/send2fa', {});
        if (send2fa.status === 'success') {
            this.check2fa();
        } else {
            alert("Oops, something went wrong. Please try again later.");
        }
    }

    async check2fa() {
        const code = window.prompt('Please enter the code sent to ' + this.state.user.username + '\'s email.');
        this.setState({
            loadingText: 'Fetching...',
        });
        const fa2 = await sendData('/dashboard/2fa', {code: code});
        if (fa2.status === 'success') {
            this.setState({
                data: fa2.data,
                auth: true,
            });
            setTimeout(() => {
                window.print();
            }, 500);
        } else {
            this.setState({
                loadingText: 'Error.',
            });
            alert("Incorrect Code");
            this.check2fa();
        }
    }


    render() {
        if (this.state.auth) {
            return (
                <div className='Export' style={{backgroundColor: 'white', color: 'black', width: '100vw', height: 'fit-content', fontSize: 10, padding: 10}}>
                    <div className='water' style={{width: '100%', fontSize: 12, color: 'black', textAlign: 'center', marginBottom: 5, fontWeight: 900}}>
                        Keypass Guard - keypassguard.com
                    </div>
                    <div key={-1} className='s' style={{ borderBottom: '1px solid black'}}>
                        <div style={{display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', height: 'fit-content',}}>
                            <div className='i' style={{width: '2%'}} >-</div>
                            <div className='t' style={{width: '20%', wordWrap: 'break-word', padding: '0 2px'}}>Site:</div>
                            <div className='u' style={{width: '20%', wordWrap: 'break-word', padding: '0 2px'}}>Username:</div>
                            <div className='p' style={{width: '20%', wordWrap: 'break-word', padding: '0 2px'}}>Password:</div>
                            <div className='p' style={{width: '38%', wordWrap: 'break-word', padding: '0 2px'}}>Note:</div>
                        </div>
                    </div>
                    {this.state.data.sites.sort((a,b) => a.name === b.name ? 0 : a.name < b.name ? -1 : 1).map((site, i) => {
                        return (
                            <div key={i} className='s' style={{ paddingBottom: 5, borderBottom: '1px solid black'}}>
                                <div style={{display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', height: 'fit-content', }}>
                                    <div className='i' style={{width: '2%'}} >{i+1}</div>
                                    <div className='t' style={{width: '20%', wordWrap: 'break-word', padding: '0 2px'}} >{site.name}</div>
                                    <div className='u' style={{width: '20%', wordWrap: 'break-word', padding: '0 2px'}}>{site.username}</div>
                                    <div className='p' style={{width: '20%', wordWrap: 'break-word', padding: '0 2px'}}>{site.password}</div>
                                    <div className='n' style={{width: '38%', wordWrap: 'break-word', padding: '0 2px'}}>{site.note.length >= 1 ? site.note : ''}</div>
                                </div>
                                
                            </div>
                        );
                    })}
                </div>
            );
        } else {
            return <div style={{color: 'black', backgroundColor: 'white'}}>{this.state.loadingText}</div>
        }
    }
}

export default Export;