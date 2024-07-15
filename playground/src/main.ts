import UserStore from '../client/Users';
const res = await UserStore.get()
switch (res.format) {
    case "JSON":
        console.log(res.response)
        break;
    case "UNKNOWN":
        console.warn((await res.response?.text()) || "No response")
        break;
}