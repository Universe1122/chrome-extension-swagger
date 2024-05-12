window.onload = function() {
    // Build a system
    const editor = SwaggerEditorBundle({
      dom_id: '#swagger-editor',
      layout: 'StandaloneLayout',
      presets: [
        SwaggerEditorStandalonePreset
      ],
      queryConfigEnabled: false,
    })

    window.editor = editor
}

const isDeepEqual = (object1, object2) => {

    const objKeys1 = Object.keys(object1);
    const objKeys2 = Object.keys(object2);
  
    if (objKeys1.length !== objKeys2.length) return false;
  
    for (var key of objKeys1) {
      const value1 = object1[key];
      const value2 = object2[key];
  
      const isObjects = isObject(value1) && isObject(value2);
  
      if ((isObjects && !isDeepEqual(value1, value2)) ||
        (!isObjects && value1 !== value2)
      ) {
        return false;
      }
    }
    return true;
};

const isObject = (object) => {
    return object != null && typeof object === "object";
  };

let prev_data = {};

setInterval(() => {
    chrome.runtime.sendMessage({data: "Your message data"}, function(response) {
        console.log(response["data"]);
        if( !isDeepEqual(prev_data, response["data"])) {
            prev_data = response["data"];
            // console.log("client: send hi", response["data"]["example.com"]["open_api"]["data"]);
            editor.specActions.updateSpec(JSON.stringify(response["data"]["example.com"]["open_api"]["data"], null, 2));
        }
    });
}, 1000)