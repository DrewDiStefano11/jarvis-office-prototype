import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const candidateFiles = new Set([
    'rooms.json',
    'walk-paths.json',
    'walls.json',
    'objects.json',
    'doors.json',
    'door-lights.json',
    'computers.json',
    'positions.json',
    'interactive-objects.json',
])

const floor1CandidateReview = () => ({
    name: 'floor1-candidate-review',
    configureServer(server) {
        server.middlewares.use('/__floor1-candidate', (request, response, next) => {
            const fileName = path.posix.basename(new URL(request.url ?? '/', 'http://localhost').pathname)
            if (!candidateFiles.has(fileName)) {
                next()
                return
            }
            const absolute = path.join(process.cwd(), 'src', 'office', 'data', 'floor1', 'provisional', fileName)
            fs.readFile(absolute, (error, bytes) => {
                if (error) {
                    response.statusCode = 404
                    response.end('Candidate file not found')
                    return
                }
                response.setHeader('Content-Type', 'application/json; charset=utf-8')
                response.setHeader('Cache-Control', 'no-store')
                response.end(bytes)
            })
        })
    },
})

// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    plugins: [
        react(),
        floor1CandidateReview(),
    ],
    server: {
        port: 8080
    }
})
