// Global test setup
beforeEach(() => {
    // Reset any mocks or state before each test
    jest.clearAllMocks()
})

// Configure test timeout globally
jest.setTimeout(30000)

// Suppress console logs during tests unless explicitly needed
const originalConsole = console
beforeAll(() => {
    console.log = jest.fn()
    console.warn = jest.fn()
    console.error = jest.fn()
})

afterAll(() => {
    console.log = originalConsole.log
    console.warn = originalConsole.warn
    console.error = originalConsole.error
})
