const getFlagEmoji = (countryCode) =>
  String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map((x) => 0x1f1a5 + x.charCodeAt()),
  );

module.exports = getFlagEmoji;
