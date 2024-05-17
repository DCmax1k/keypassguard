import React, { Component } from 'react';
import LockedInput from './LockedInput';
import sendData from './util/sendData';

class EditSite extends Component {
    constructor(props) {
        super(props);
        this.state = {
            id: '',
            name: '',
            username: '',
            password: '',
            note: '',

            inputsLocked: true,
            encrypted: true,
        }

        this.changeName = this.changeName.bind(this);
        this.changeUsername = this.changeUsername.bind(this);
        this.changePassword = this.changePassword.bind(this);
        this.changeNote = this.changeNote.bind(this);
        this.goBack = this.goBack.bind(this);
        this.unlockEdit = this.unlockEdit.bind(this);
        this.updateParentSite = this.updateParentSite.bind(this);
        this.deleteSite = this.deleteSite.bind(this);
        this.requestdecrypt = this.requestdecrypt.bind(this);

        this.passwordRef = React.createRef();
    }

    setSite(site) {
        this.setState({
            id: site.id,
            name: site.name,
            username: site.username,
            password: site.password,
            note: site.note,

            // Reset etc state
            inputsLocked: true,
            encrypted: true,
        });

        this.passwordRef.current.hidePassword();
    }

    updateParentSite() {
        const site = this.getCurrentSite();
        return this.props.updateParentSite(site);
    }

    getCurrentSite() {
        return {
            id: this.state.id,
            name: this.state.name,
            username: this.state.username,
            password: this.state.password,
            note: this.state.note,
        }
    }

    changeName(name) {
        this.setState({
            name,
        });
    }
    changeUsername(username) {
        this.setState({
            username,
        });
    }
    changePassword(password) {
        this.setState({
            password,
        });
    }
    changeNote(note) {
        this.setState({
            note,
        });
    }

    goBack(skip) {
        if (!skip && !this.state.inputsLocked) {
            const t = window.confirm("Discard changes and go back?");
            if (!t) {
                return;
            }
        }
        this.props.goBack();
        this.setState({
            inputsLocked: true,
        });
    }

    async unlockEdit(justAdded) {
        if (!this.state.inputsLocked) {
            // Clicked save, update parent
            const worked = await this.updateParentSite();
            console.log('worked..: ', worked);
            if (worked) {
                this.props.customAlert('Successfully saved site.', true);
            } else {
                this.props.customAlert('Error occured. Please try again later.', false);
            }
        } else {
            // Clicked edit
            // Decrypt password if not already
            if (justAdded) {
                // Just added site, no need to encrypt
                this.setState({
                    encrypted: false,
                });
            } else {
                await this.requestdecrypt(this.state);
            }
            
        }
        this.setState({
            inputsLocked: !this.state.inputsLocked,
        });
    }

    async requestdecrypt(site) {

        if (!site) { site = this.state; }
        // Request decrypt from server
        if (this.state.encrypted) {
            try {
                const res = await sendData('/dashboard/requestdecrypt', {site});
                if (res.status === 'success') {
                    this.setState({
                        password: atob(res.data),
                        encrypted: false,
                    });
                    return atob(res.data);
                
                } else {
                    this.props.customAlert('Failed to request password.', false);
                }
            } catch(err) {
                console.error(err);
                this.props.customAlert('Internal error. ' + err, false);
            }
        } else {
            return this.state.password;
        }
    }

    deleteSite() {
        const confirming = window.confirm(`Are you sure you want to delete your saved information for ${this.state.name.length > 0 ? this.state.name : "Unamed site"}`);
        if (confirming) this.actuallyDeleteSite();
    }

    async actuallyDeleteSite() {
        try {
            const site = this.getCurrentSite();
            const response = await sendData('/dashboard/deletesite', {site});
            if (response.status === 'success') {
                this.goBack(true);
                this.props.deleteSite(site);
            }
        } catch(err) {
            console.error(err);
        }
    }

    render() {
        return (
            <div className={`EditSite ${this.props.open ? 'open' : 'closed'}`} >
                <div className='body'>
                    <img onClick={() => this.goBack(false)} className={'leftArrow ' + true} src='/images/icons/arrowRight.svg' alt='Left arrow' />
                    <div className='row full'>
                        <LockedInput className='siteName' value={this.state.name} onInput={this.changeName} placeholder={'ex. Keypass Guard'} type={'text'} customAlert={this.props.customAlert} copy={false} locked={this.state.inputsLocked} />
                    </div>
                    <div className='row'>
                        <span>Username</span>
                        <LockedInput className='username' value={this.state.username} onInput={this.changeUsername} placeholder={''} type={'text'} customAlert={this.props.customAlert} copy={true} locked={this.state.inputsLocked} />
                    </div>
                    <div className='row'>
                        <span>Password</span>
                        <LockedInput className='password' value={this.state.password} ref={this.passwordRef} onInput={this.changePassword} placeholder={''} type={'password'} wand={true} customAlert={this.props.customAlert} requestdecrypt={this.requestdecrypt} copy={true} locked={this.state.inputsLocked} site={this.state} encrypted={this.state.encrypted} />
                    </div>
                    <div className='row'>
                        <span>Note</span>
                        <LockedInput className='note' value={this.state.note} onInput={this.changeNote} placeholder={''} type={'text'} customAlert={this.props.customAlert} copy={false} locked={this.state.inputsLocked} />
                    </div>
                    <div className='row'>
                        <div></div>
                        <div onClick={() => this.unlockEdit(false)} className='hollowBtn'>{this.state.inputsLocked ? "Edit" : "Save"}</div>
                        <img onClick={this.deleteSite} className={'trash ' + this.state.inputsLocked} src='/images/icons/trash.svg' alt='delete site' />
                    </div>
                    
                </div>
            </div>
        );
    }
}

export default EditSite;