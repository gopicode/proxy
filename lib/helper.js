module.exports = {
  pick: function(obj, ...keys) {
    return keys.reduce((result, key) => {
      if (key in obj) result[key] = obj[key];
      return result;
    }, {})
  }
}
