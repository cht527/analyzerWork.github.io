class Cookie {
  cookieMap = new Map();
  constructor() {
    this.init();
  }
  init() {
    const allCookies = document.cookie;
    console.log(allCookies);
    if (allCookies.length) {
      const cookieArray = allCookies.split("; ");

      cookieArray.forEach((cookie) => {
        const [name, value] = cookie.split("=");
        this.cookieMap.set(name, value);
      });
    }

    this.authCheck();

    
  }
  authCheck = () => {
    const user = this.get("name");
    const currentUser = USER_INFO.find(({ name }) => name === user);
    console.log(user, currentUser);
    if (!user || !currentUser) {
        if(window.location.pathname !== "/login.html"){
          ANAlYZER_UTILS.locateToPage({path:'login.html'});
        }      
    } else {
        if(window.location.pathname === "/login.html"){
            ANAlYZER_UTILS.locateToPage({type:'replace'});
        }
    }
  }
  set(key, value) {
    this.cookieMap.set(key, value);

    const date = new Date();
    const ms = 12 * 3600 * 1000;
    date.setTime(date.getTime() + ms);

    document.cookie = `${key}=${encodeURIComponent(
      value
    )}; expires=${date.toGMTString()}; SameSite=None; Secure`;
  }

  get(key) {
    if (this.cookieMap.has(key)) {
      return decodeURIComponent(this.cookieMap.get(key));
    }
  }
}
