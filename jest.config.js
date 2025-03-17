module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: [
    'client/src/**/*.{js,jsx}',
    '!client/src/index.js',
    '!**/node_modules/**'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(@babel/runtime)/)'
  ],
  moduleFileExtensions: ['js', 'jsx', 'json', 'node']
}; 