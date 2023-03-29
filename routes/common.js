var genApiKey = function() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (var i = 0; i < 9; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var genInviteId = function() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (var i = 0; i < 9; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

module.exports = {
  genApiKey: genApiKey,
  genInviteId: genInviteId
};
