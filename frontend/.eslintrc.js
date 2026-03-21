module.exports = {
  extends: [
    'expo',
    'plugin:react-native-a11y/recommended',
  ],
  rules: {
    'react-native-a11y/has-accessibility-props': 'error',
    'react-native-a11y/has-valid-accessibility-role': 'error',
  },
};
