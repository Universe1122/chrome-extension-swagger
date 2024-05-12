/*
    호스트 등록 될 때, HostInfo 클래스 선언해서 로깅
*/


const host_info_list = {};


function packetMonitor(details) {
    const current_host = new URL(details.url).host;

    let result = "";
    if (/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/.test(current_host)) {
        result = current_host;
    }
    else {
        result =  current_host.split('.').slice(-2).join(".");
    }

    if (host_info_list[result] == undefined){
        host_info_list[result] = new HostInfo(result)
    }
    
    host_info_list[result].open_api.add(details)
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.remove("host")
    console.log("remove")
})

chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log("chage storage")
    const url_pattern = [];

    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        if(newValue == undefined) {
            continue
        }

        for(let host of newValue) {
            console.log("new host: ", host)
            url_pattern.push(`*://*.${host}/*`)
        }
    }

    console.log("remove event listener")
    // onBeforeRequest
    chrome.webRequest.onBeforeRequest.removeListener(packetMonitor);

    if(url_pattern.length != 0){
        console.log("add event listener: ", url_pattern)
        chrome.webRequest.onBeforeRequest.addListener(packetMonitor, {urls : url_pattern, types : ["main_frame", "sub_frame", "xmlhttprequest"]}, ["requestBody"])
    }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    // console.log("server: client hi", message);
    // 메시지를 받은 후 추가 작업 수행

    sendResponse({data: host_info_list});
});


class HostInfo {
    constructor(host) {
        this.open_api = new OpenApi(host);
    }
}

class OpenApi {
    constructor(host) {
        this.data = {
            "openapi" : "3.0.0",
            "info" : {},
            "servers" : [
                {
                    "url" : host
                }
            ],
            "paths" : {},
            "tags" : []
        }
    }

    add(detail) {

        const url = new URL(detail.url);
        const method = detail.method.toLowerCase();
        const path = url.pathname;
        const params = new URLSearchParams(url.search)
        const body = detail.requestBody;

        if(method == "options") {
            return;
        }

        // 새로운 path 인 경우
        if(this.data["paths"][path] == undefined){
            this.data["paths"][path] = {};
            this.data["paths"][path][method] = {};
            this.data["paths"][path][method]["parameters"] = [];
            this.data["paths"][path][method]["tags"] = [url.host];
            if(params) {
                this.data["paths"][path][method]["parameters"] = this._addParam([], params)
            }

            // 새로운 body 추가
            // todo, json 도 넣도록
            if(body && body["formData"]) {
                let req_body = {};

                for(let key in body["formData"]) {
                    req_body[key] = {
                        "example" : body["formData"][key]
                    }
                }

                this.data["paths"][path][method]["requestBody"] = {
                    "content" : {
                        "application/x-www-form-urlencoded": {
                            "schema": {
                                "type" : "object",
                                "properties" : req_body
                            }
                        }
                    }
                }
            }
        }

        // 기존에 존재하는 path인 경우
        else{
            // 새로운 method 인 경우
            if(this.data["paths"][path][method] == undefined) {
                this.data["paths"][path][method] = {};
                this.data["paths"][path][method]["parameters"] = [];

                if(params) {
                    this.data["paths"][path][method]["parameters"] = this._addParam(this.data["paths"][path][method]["parameters"], params)
                }
            }  

            // 기존에 존재하는 method 인 경우 
            else {
                if(params) {
                    this.data["paths"][path][method]["parameters"] = this._addParam(this.data["paths"][path][method]["parameters"], params)
                }
            }

            // todo, json 도 넣도록
            if(body && body["formData"]){
                this.data["paths"][path][method]["requestBody"]["content"]["application/x-www-form-urlencoded"]["schema"]["properties"] = this._addBody(this.data["paths"][path][method]["requestBody"]["content"]["application/x-www-form-urlencoded"]["schema"]["properties"], body["formData"])
            }
        }

        // tag 추가
        let check = 0;
        for(let tag of this.data["tags"]) {
            if(tag["name"] == url.host) {
                check = 1;
                break;
            }
        }

        if(check == 0) {
            this.data["tags"].push({
                "name" : url.host,
                "description" : ""
            })
        }
    }

    _addParam(prev_params, new_params) {
        let result = []

        for(let new_param of new_params.entries()) {
            let check = 0;

            for(let prev_param of prev_params) {
                // 이미 존재하는 parameter 정보
                if(prev_param["name"] = new_param[0]) {
                    result.push(prev_param)
                    check = 1;
                    break;
                }
            }

            // 새로운 파라미터 정보
            if(check == 0) {
                result.push({
                    "name" : new_param[0],
                    "description" : new_param[1]
                })
            }
        }

        return result;
    }

    _addBody(prev_body, new_body){
        let result = {};
        

        for(let n_body in new_body) {
            let check = 0;

            for(let p_body in prev_body) {
                if(p_body == n_body) {
                    check = 1;
                    result[p_body] = prev_body[p_body];
                    break;
                }
            }

            if(check == 0) {
                result[n_body] = new_body[n_body];
            }
        }

        return result;
    }
}