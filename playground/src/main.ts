import UserStore from '../client/Users';

console.log(UserStore)

console.log(await UserStore.default().then(res => res.text()))