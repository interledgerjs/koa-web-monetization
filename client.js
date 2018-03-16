function u8tohex (arr) {
  var vals = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f' ]
  var ret = ''
  for (var i = 0; i < arr.length; ++i) {
    ret += vals[(arr[i] & 0xf0) / 0x10]
    ret += vals[(arr[i] & 0x0f)]
  }
  return ret
}

window.addEventListener('load', function (receiverUrl) {
  var idBytes = new Uint8Array(16)
  crypto.getRandomValues(idBytes)
  var id = u8tohex(idBytes)
  var receiver = receiverUrl.replace(/:id/, id)

  if (window.monetize) {
    window.monetize({
      receiver
    })
  } else {
    console.log('Your extension is disabled or not installed.' +
      ' Manually pay to ' + receiver)
    Promise.reject(new Error('web monetization is not enabled'))
  }
})
