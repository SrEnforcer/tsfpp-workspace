import { describe, it, expect } from 'vitest'
import { greet } from './index.js'

describe('greet', () => {
  it('returns a greeting for a valid username', () => {
    expect(greet('alice')).toBe('Hello, alice!')
  })

  it('returns an error message for an empty string', () => {
    expect(greet('')).toBe('Error: Username must not be empty.')
  })

  it('returns an error message when the username exceeds 32 characters', () => {
    const long = 'a'.repeat(33)
    expect(greet(long)).toBe('Error: Username exceeds 32 characters (got 33).')
  })

  it('accepts a username of exactly 32 characters', () => {
    const exact = 'a'.repeat(32)
    expect(greet(exact)).toBe(`Hello, ${'a'.repeat(32)}!`)
  })
})
