import log from "./watcher";

function test(){
    log("Hello, World!");
}

function another(){
    log("Another function");
}

console.log("Hello, World!");

export {log, test, another}