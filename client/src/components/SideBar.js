import React, { Component } from 'react';

class SideBar extends Component {
    constructor(props) {
        super(props);


         this.toggle = this.toggle.bind(this);
         this.logout = this.logout.bind(this);
    }

    toggle() {
        this.props.toggle();
    }

    logout() {
        this.props.logout();
    }

    render() {
        return (
            <div className={`SideBar ${this.props.sideBar}`}>
                <img onClick={this.toggle} className='closeSideBar' src='/images/icons/x.svg' alt='Close sidebar' />
                <div className='profileImage'>
                    <img src='/images/darkLock.svg' />
                    <h2>{this.props.user.username}</h2>
                </div>
                <h4>Settings</h4>
                <div onClick={this.logout} className='logoutBtn'>
                    Logout
                </div>
            </div>
        );
    }
}

export default SideBar;