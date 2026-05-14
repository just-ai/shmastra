import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { sessionAls, type UserSession } from '../src/shmastra/auth'
import { injectSessionHeaders } from '../src/shmastra/gateway'

const GUEST: UserSession = {
  role: 'guest',
  sessionId: 'sid-1',
  sessionKey: 'sk_test_123',
  userId: 'user-42',
  referrer: '/apps/demo',
}

const OWNER: UserSession = { role: 'owner', userId: 'owner-user' }

function fakeModel(headers: unknown) {
  return { config: { headers } } as any
}

beforeEach(() => {
  vi.stubEnv('USER_ID', undefined as unknown as string)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('injectSessionHeaders (provider-agnostic)', () => {
  it('preserves the original headers returned by the provider', () => {
    const model = fakeModel(() => ({ Authorization: 'Bearer vk-owner', 'OpenAI-Org': 'acme' }))
    injectSessionHeaders(model)
    const headers = model.config.headers()
    expect(headers.Authorization).toBe('Bearer vk-owner')
    expect(headers['OpenAI-Org']).toBe('acme')
  })

  it('adds both user-id and session-key headers for a guest', () => {
    const model = fakeModel(() => ({ Authorization: 'Bearer vk-owner' }))
    injectSessionHeaders(model)
    sessionAls.run(GUEST, () => {
      const h = model.config.headers()
      expect(h['x-shmastra-user-id']).toBe('user-42')
      expect(h['x-shmastra-session-key']).toBe('sk_test_123')
      expect(h.Authorization).toBe('Bearer vk-owner')
    })
  })

  it('adds only user-id (no session-key) for the owner', () => {
    const model = fakeModel(() => ({ Authorization: 'Bearer vk-owner' }))
    injectSessionHeaders(model)
    sessionAls.run(OWNER, () => {
      const h = model.config.headers()
      expect(h['x-shmastra-user-id']).toBe('owner-user')
      expect('x-shmastra-session-key' in h).toBe(false)
    })
  })

  it('emits no shmastra headers when there is no user in the ALS', () => {
    const model = fakeModel(() => ({ Authorization: 'Bearer x' }))
    injectSessionHeaders(model)
    const h = model.config.headers()
    expect('x-shmastra-user-id' in h).toBe(false)
    expect('x-shmastra-session-key' in h).toBe(false)
    expect(h.Authorization).toBe('Bearer x')
  })

  it('reads ALS lazily — one wrapped model serves multiple concurrent users', () => {
    const model = fakeModel(() => ({ Authorization: 'Bearer vk-owner' }))
    injectSessionHeaders(model)

    const other: UserSession = { role: 'guest', sessionId: 'sid-2', sessionKey: 'sk_two', userId: 'user-99', referrer: '/b' }
    const a = sessionAls.run(GUEST, () => model.config.headers())
    const b = sessionAls.run(other, () => model.config.headers())
    const o = sessionAls.run(OWNER, () => model.config.headers())

    expect(a['x-shmastra-user-id']).toBe('user-42')
    expect(a['x-shmastra-session-key']).toBe('sk_test_123')
    expect(b['x-shmastra-user-id']).toBe('user-99')
    expect(b['x-shmastra-session-key']).toBe('sk_two')
    expect(o['x-shmastra-user-id']).toBe('owner-user')
    expect('x-shmastra-session-key' in o).toBe(false)
  })

  it('is a no-op when the model has no config', () => {
    const model = {} as any
    expect(() => injectSessionHeaders(model)).not.toThrow()
  })

  it('leaves config.headers alone when it is not a function', () => {
    const model = fakeModel({ Authorization: 'Bearer x' })
    injectSessionHeaders(model)
    expect(model.config.headers).toEqual({ Authorization: 'Bearer x' })
  })
})

describe('injectSessionHeaders works on real AI SDK providers', () => {
  it.each([
    ['openai', () => createOpenAI({ apiKey: 'sk-test' }).responses('gpt-5.4')],
    ['anthropic', () => createAnthropic({ apiKey: 'sk-ant-test' })('claude-sonnet-4-6')],
    ['google', () => createGoogleGenerativeAI({ apiKey: 'g-test' }).chat('gemini-3-flash-preview')],
  ])('propagates session headers for %s', (_name, build) => {
    const model = build() as any
    injectSessionHeaders(model)

    sessionAls.run(GUEST, () => {
      const h = model.config.headers()
      expect(h['x-shmastra-user-id']).toBe('user-42')
      expect(h['x-shmastra-session-key']).toBe('sk_test_123')
    })
  })
})
