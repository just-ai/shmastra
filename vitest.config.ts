import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/shmastra/**/*.ts'],
            exclude: ['src/shmastra/**/*.test.ts', 'src/shmastra/**/index.ts'],
        },
    },
})
