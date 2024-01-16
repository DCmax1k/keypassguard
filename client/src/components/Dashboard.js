import React, { Component } from 'react';
import SearchInput from './SearchInput';
import EditSite from './EditSite';
import sendData from './util/sendData';
import SideBar from './SideBar';


// TESTING SITE PLACEHOLDER
const sites = [];
for (let i = 0; i<7; i++) {
    const id = Math.random()+Date.now();
    const site = {id, name: JSON.stringify(id), username: 'Dcmax1k', password: 'password1234!', note: ''}
    sites.push(site);
}
class Dashboard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user: null,
            loggedIn: false,
            loadingText: 'Logging in...',
            fadeOut: false,
            query: "",

            activeSite: null,
            siteOpen: false,

            sideBar: false,
        };

        this.editSiteRef = React.createRef();

        this.setSite = this.setSite.bind(this);
        this.toggleSiteWindow = this.toggleSiteWindow.bind(this);
        this.updateSite = this.updateSite.bind(this);
        this.addSite = this.addSite.bind(this);
        this.deleteSite = this.deleteSite.bind(this);
        this.search = this.search.bind(this);
        this.toggleSideBar = this.toggleSideBar.bind(this);
        this.closeAllMenus = this.closeAllMenus.bind(this);
        this.editUser = this.editUser.bind(this);
    }

    async componentDidMount() {
        try {
            const checkLogin = await sendData('/auth', {});
            //const checkLogin = {user: {username: 'DCmax1k', plus: false, sites, settings: {emailVerified: false,}, email: 'dylan@digitalcaldwell.com', },status: 'success',};
            if (checkLogin.status === 'success') {
                const user = checkLogin.user;
                this.setState({
                    user,
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

    search(value) {
        this.setState({
            query: value,
        });
    }

    toggleSiteWindow() {
        this.setState({
            siteOpen: !this.state.siteOpen,
        });
    }

    setSite(site) {
        this.setState({
            activeSite: site,
        });
        this.toggleSiteWindow();
        this.editSiteRef.current.setSite(site);
    }

    async updateSite(site) {
        let user = this.state.user;
        const sites = this.state.user.sites;
        let ind = sites.findIndex((s) => {return s.id === site.id});
        sites[ind] = site;
        user.sites = sites;
        this.setState({
            user,
        });
        try {
            sendData('/dashboard/editsite', {site});
        } catch(err) {
            console.error(err);
        }
    }

    async addSite() {
        try {
            const response = await sendData('/dashboard/addsite', {});
            if (response.status === 'success') {
                const user = this.state.user;
                const sites = this.state.user.sites;
                const site = response.site;
                sites.push(site);
                user.sites = sites;
                this.setState({
                    user,
                });
                this.setSite(site);
                this.editSiteRef.current.unlockEdit(true);
            }
        } catch(err) {
            console.error(err);
        }
    }

    deleteSite(site) {
        const user = this.state.user;
        const ind = user.sites.findIndex((s) => s.id === site.id);
        user.sites.splice(ind, 1);
        this.setState({
            user,
        });
    }

    filterSites(sites) {
        const query = this.state.query;
        if (query.length === 0) return sites;
        const filtered = sites.filter((s) => {
            if (s.name.toLowerCase().includes(query.toLowerCase())) return true;
            return false;
        });
        return filtered;
    }

    toggleSideBar() {
        this.setState({
            sideBar: !this.state.sideBar,
        })
    }

    closeAllMenus() {
        this.setState({
            sideBar: false,
        })
    }

    async logout() {
        try {
            const response = await sendData('/login/logout', {});
            if (response.status === 'success') {
                window.location.href = '/';
            }
        } catch(err) {
            console.error(err);
        }
    }

    editUser(user) {
        this.setState({
            user,
        });
    }

    render() {

        return this.state.loggedIn ? (
            <div className={`Dashboard ${this.state.loggedIn}`}>
                {/* Darken screen to exit all menus */}
                <div onClick={this.closeAllMenus} className={`darken ${this.state.sideBar}`}>

                </div>
                {/* Body */}
                <div className='body'>
                    <img className='logo' src='/images/logo.svg' alt='Keypass Guard' />
                    <h3>{this.state.user.sites.length} site key{this.state.user.sites.length === 1 ? '':'s'} secure</h3>
                    <div className='inputs'>
                        <SearchInput onInput={this.search} placeholder={"Search site"} />
                        <div onClick={this.addSite} className='hollowBtn addSite'>Add site</div>
                    </div>
                    <div className='sites'>
                        {this.filterSites(this.state.user.sites).sort((a,b) => a.name === b.name ? 0 : a.name < b.name ? -1 : 1).map(site => {
                            return (
                            <div className='siteCont' key={site.id}>
                                <div onClick={() => this.setSite(site)} className='site'>
                                    {site.name}
                                </div>
                                <img src='/images/icons/arrowRight.svg' alt='Right arrow' />
                                
                            </div>
                            )
                        })}
                    </div>
                    
                </div>
                <img onClick={this.toggleSideBar} className='profileBtn' src="/images/profile.svg" alt='profile settings' />
                <SideBar logout={this.logout} user={this.state.user} editUser={this.editUser} toggle={this.toggleSideBar} sideBar={this.state.sideBar} />

                {/* Edit site */}
                <EditSite ref={this.editSiteRef} open={this.state.siteOpen} goBack={this.toggleSiteWindow} updateParentSite={this.updateSite} deleteSite={this.deleteSite} />
            </div>
        ) : (
            <div className={`Loading ${this.state.fadeOut ? 'fadeOut' : ''}`}>
                <img className='loading' src='/images/loading.svg' alt='loading' />
                {this.state.loadingText}
            </div>
        );
    }
}

export default Dashboard;