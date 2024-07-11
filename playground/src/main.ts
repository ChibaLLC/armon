import UserStore from '../client/Users';

console.log(UserStore)

console.log(await UserStore.get().then(res => res.text()))