import LobbyController from './controllers/lobbyController.js'
import RoomsController from './controllers/roomsController.js'
import { constants } from './util/constants.js'
import SocketServer from './util/socket.js'
import Event from 'events'

const port = process.env.POST || 3000

const socketServer = new SocketServer({ port })
const roomsPubSub = new Event()

const socket = await socketServer.start()

const roomsController = new RoomsController({
  roomsPubSub,
})
const lobbyController = new LobbyController({
  activeRooms: roomsController.rooms,
  roomsListeners: roomsPubSub,
})

const namespaces = {
  room: {
    controller: roomsController,
    eventEmitter: new Event(),
  },
  lobby: {
    controller: lobbyController,
    eventEmitter: roomsPubSub,
  },
}

// namespaces.room.eventEmitter.on(
//   'userConnected',
//   namespaces.room.controller.onNewConnection.bind(namespaces.room.controller)
// )

// namespaces.room.eventEmitter.emit('userConnected', { id: '001' })
// namespaces.room.eventEmitter.emit('userConnected', { id: '002' })
// namespaces.room.eventEmitter.emit('userConnected', { id: '003' })

const routeConfig = Object.entries(namespaces).map(
  ([namespace, { controller, eventEmitter }]) => {
    const controllerEvents = controller.getEvents()

    eventEmitter.on(
      constants.events.USER_CONNECTED,
      controller.onNewConnection.bind(controller)
    )

    return {
      [namespace]: {
        events: controllerEvents,
        eventEmitter,
      },
    }
  }
)

socketServer.attatchEvents({ routeConfig })

console.log(`socket server running at ${socket.address().port}`)
