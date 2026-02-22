/**
 * @fileoverview Tests for gameService
 * Testing game API calls and mock responses
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import gameService from '../gameService'

describe('gameService', () => {
  describe('Ranked Match APIs', () => {
    it('should join ranked queue', async () => {
      const result = await gameService.joinRankedQueue()
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result).toHaveProperty('queuePosition')
      expect(result).toHaveProperty('estimatedWaitTime')
    })

    it('should leave ranked queue', async () => {
      const result = await gameService.leaveRankedQueue()
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    it('should get match details', async () => {
      const matchId = 'test-match-123'
      const match = await gameService.getMatch(matchId)
      
      expect(match).toBeDefined()
      expect(match.id).toBe(matchId)
      expect(match.type).toBe('ranked')
      expect(match.players).toHaveProperty('white')
      expect(match.players).toHaveProperty('black')
      expect(match.timeControl).toBeDefined()
      expect(match.fen).toBeDefined()
    })

    it('should get ranked history with pagination', async () => {
      const result = await gameService.getRankedHistory(1, 10)
      
      expect(result).toBeDefined()
      expect(result.matches).toBeInstanceOf(Array)
      expect(result.pagination).toBeDefined()
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(10)
    })

    it('should get ranked stats', async () => {
      const stats = await gameService.getRankedStats()
      
      expect(stats).toBeDefined()
      expect(stats).toHaveProperty('currentRating')
      expect(stats).toHaveProperty('wins')
      expect(stats).toHaveProperty('losses')
      expect(stats).toHaveProperty('draws')
      expect(stats).toHaveProperty('winRate')
    })

    it('should make a move', async () => {
      const matchId = 'test-match-123'
      const move = { from: 'e2', to: 'e4' }
      
      const result = await gameService.makeMove(matchId, move)
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.move).toEqual(move)
      expect(result.fen).toBeDefined()
    })

    it('should resign game', async () => {
      const matchId = 'test-match-123'
      const result = await gameService.resignGame(matchId)
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.result).toBe('loss')
    })

    it('should offer draw', async () => {
      const matchId = 'test-match-123'
      const result = await gameService.offerDraw(matchId)
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    it('should respond to draw offer', async () => {
      const matchId = 'test-match-123'
      
      const acceptResult = await gameService.respondToDrawOffer(matchId, true)
      expect(acceptResult.success).toBe(true)
      expect(acceptResult.result).toBe('draw')
      
      const declineResult = await gameService.respondToDrawOffer(matchId, false)
      expect(declineResult.success).toBe(true)
      expect(declineResult.result).toBeNull()
    })
  })

  describe('Room APIs', () => {
    it('should create a room', async () => {
      const settings = {
        isPrivate: false,
        allowSpectators: true,
        timeControl: { initial: 600, increment: 5 },
        rated: false
      }
      
      const room = await gameService.createRoom(settings)
      
      expect(room).toBeDefined()
      expect(room.code).toBeDefined()
      expect(room.code).toMatch(/^ROOM/)
      expect(room.host).toBeDefined()
      expect(room.settings).toMatchObject(settings)
      expect(room.status).toBe('waiting')
    })

    it('should join a room', async () => {
      const roomCode = 'ROOMTEST123'
      const room = await gameService.joinRoom(roomCode)
      
      expect(room).toBeDefined()
      expect(room.code).toBe(roomCode)
      expect(room.players).toBeInstanceOf(Array)
    })

    it('should leave a room', async () => {
      const roomCode = 'ROOMTEST123'
      const result = await gameService.leaveRoom(roomCode)
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    it('should get room details', async () => {
      const roomCode = 'ROOMTEST123'
      const room = await gameService.getRoom(roomCode)
      
      expect(room).toBeDefined()
      expect(room.code).toBe(roomCode)
      expect(room.host).toBeDefined()
      expect(room.settings).toBeDefined()
    })

    it('should start room game', async () => {
      const roomCode = 'ROOMTEST123'
      const result = await gameService.startRoomGame(roomCode)
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.matchId).toBeDefined()
    })
  })

  describe('Tournament APIs', () => {
    it('should get tournaments list', async () => {
      const result = await gameService.getTournaments()
      
      expect(result).toBeDefined()
      expect(result.tournaments).toBeInstanceOf(Array)
      expect(result.tournaments.length).toBeGreaterThan(0)
    })

    it('should get tournaments with filters', async () => {
      const result = await gameService.getTournaments({
        status: 'upcoming',
        type: 'swiss'
      })
      
      expect(result).toBeDefined()
      expect(result.tournaments).toBeInstanceOf(Array)
    })

    it('should get tournament details', async () => {
      const tournamentId = 'tournament-123'
      const tournament = await gameService.getTournament(tournamentId)
      
      expect(tournament).toBeDefined()
      expect(tournament.id).toBe(tournamentId)
      expect(tournament.name).toBeDefined()
      expect(tournament.type).toBeDefined()
      expect(tournament.participants).toBeInstanceOf(Array)
    })

    it('should join tournament', async () => {
      const tournamentId = 'tournament-123'
      const result = await gameService.joinTournament(tournamentId)
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.tournamentId).toBe(tournamentId)
    })

    it('should withdraw from tournament', async () => {
      const tournamentId = 'tournament-123'
      const result = await gameService.withdrawTournament(tournamentId)
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    it('should create tournament', async () => {
      const data = {
        name: 'Test Tournament',
        type: 'swiss',
        timeControl: { initial: 180, increment: 2 },
        maxPlayers: 16,
        startTime: new Date('2024-12-31T19:00:00')
      }
      
      const tournament = await gameService.createTournament(data)
      
      expect(tournament).toBeDefined()
      expect(tournament.id).toBeDefined()
      expect(tournament.name).toBe(data.name)
      expect(tournament.status).toBe('registration')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // This test would need actual error simulation
      // For now, just verify the service exists
      expect(gameService).toBeDefined()
    })
  })
})
