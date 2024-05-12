function getHost() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ currentWindow: true, active: true }, tabs => {
            const current_tab_url = tabs[0].url;
            const current_host = new URL(current_tab_url).host;

            let result = "";
            if (/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/.test(current_host)) {
                result = current_host;
            }
            else {
                result =  current_host.split('.').slice(-2).join(".");
            }
            
            resolve(result);
            // document.getElementById("result").innerHTML = result
        });
    })
}

function configureHost() {
    const host = document.getElementById("result").innerText;
    const mode = document.getElementById("start").innerHTML;

    if(mode == "enable") {
        chrome.storage.local.get("host", (result) => {
            if (!("host" in result)) {
                chrome.storage.local.set({"host" : [host]})
            }
            else if (result["host"].indexOf(host) == -1) {
                result["host"].push(host)
                chrome.storage.local.set({"host" : result["host"]})
            }
            document.getElementById("start").innerHTML = "disable";
        })
    }
    else if (mode == "disable") {
        chrome.storage.local.get("host", (result) => {
            if (("host" in result) && result["host"].indexOf(host) != -1) {
                const idx = result["host"].indexOf(host);
                if (idx > -1) {
                    result["host"].splice(idx, 1);
                    chrome.storage.local.set({"host" : result["host"]})
                }
                document.getElementById("start").innerHTML = "enable";
            }
        })
    } 
}

/*
    local storage에 이미 존재하는 host 인지 확인
    - 존재하는 host인 경우, disable button 생성
    - 새로운 host인 경우, enable button 생성
*/  
function checkExistHost(host) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get("host", (result) => {
            if (!("host" in result) || result["host"].indexOf(host) == -1) {
                // 새로운 host
                resolve(true)
            }
            else{
                // 존재하는 host
                resolve(false)
            }
        })
    })

}

async function start() {
    const host = await getHost();
    document.getElementById("result").innerHTML = host

    checkExistHost(host).then((result) => {
        console.log(result)
        if(result) {
            document.getElementById("start").innerHTML = "enable";
        }
        else {
            document.getElementById("start").innerHTML = "disable";
        }
    })

    document.getElementById("start").addEventListener("click", configureHost)
}

document.addEventListener('DOMContentLoaded', start)