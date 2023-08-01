import { constants } from '../util/constants.js'

export default class LobbyController {
  constructor({ activeRooms, roomsListeners }) {
    this.activeRooms = activeRooms
    this.roomsListeners = roomsListeners
  }

  onNewConnection(socket) {
    const { id } = socket
    console.log(`[lobby] connection stabilished with ${id}`)
    this.#updateLobbyRooms(socket, [...this.activeRooms.values()])
    this.#activeEventProxy(socket)
  }

  #updateLobbyRooms(socket, activeRooms) {
    socket.emit(constants.events.LOBBY_UPDATED, activeRooms)
  }

  #activeEventProxy(socket) {
    this.roomsListeners.on(constants.events.LOBBY_UPDATED, (rooms) => {
      this.#updateLobbyRooms(socket, rooms)
    })
  }

  getEvents() {
    const functions = Reflect.ownKeys(LobbyController.prototype)
      .filter((fn) => fn !== 'constructor')
      .map((name) => [name, this[name].bind(this)])

    return new Map(functions)
  }
}
