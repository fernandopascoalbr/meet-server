import Attendee from '../entities/attendee.js'
import Room from '../entities/room.js'
import { constants } from '../util/constants.js'
import CustomMap from '../util/customMap.js'

export default class RoomsController {
  #users = new Map()

  constructor({ roomsPubSub }) {
    this.roomsPubSub = roomsPubSub
    this.rooms = new CustomMap({
      observer: this.#roomsObserver(),
      customMapper: this.#mapRoom.bind(this),
    })
  }

  #roomsObserver() {
    return {
      notify: this.notifyRoomsSubscribers.bind(this),
    }
  }

  speakAnswer(socket, { answer, user }) {
    console.log('speakAnswer')
    const currentUser = this.#users.get(user.id)
    const updatedUser = new Attendee({
      ...currentUser,
      isSpeaker: answer,
    })
    this.#users.set(user.id, updatedUser)
    const roomId = user.roomId
    const room = this.rooms.get(roomId)
    const userOnRoom = [...room.users.values()].find(({ id }) => id === user.id)

    room.users.delete(userOnRoom.id)
    room.users.add(userOnRoom)
    this.rooms.set(roomId, room)

    socket.emit(constants.events.UPGRADE_USER_PERMISSION, updatedUser)

    // notifica a sala para ligar para o novo speaker
    this.#notifyUserProfileUpgrade(socket, roomId, updatedUser)
  }

  speakRequest(socket) {
    const socketId = socket.id
    const user = this.#users.get(socketId)
    const roomId = user.roomId
    const owner = this.rooms.get(roomId)?.owner
    if (owner) {
      socket.to(owner.id).emit(constants.events.SPEAK_REQUEST, user)
    }
  }

  notifyRoomsSubscribers(rooms) {
    const event = constants.events.LOBBY_UPDATED
    this.roomsPubSub.emit(event, [...rooms.values()])
  }

  onNewConnection(socket) {
    const { id } = socket
    console.log('connection stabilished with', id)
    this.#updateGlobalUserData(id)
  }
  disconnect(socket) {
    this.#logoutUser(socket)
    console.log('disconnect', socket.id)
  }
  #logoutUser(socket) {
    const userId = socket.id
    const user = this.#users.get(userId)
    const roomId = user.roomId
    // remover user da lista de usuarios ativa
    this.#users.delete(user.id)

    if (!this.rooms.has(roomId)) return

    const room = this.rooms.get(roomId)
    const toBeRemoved = [...room.users].find(({ id }) => id === userId)
    room.users.delete(toBeRemoved)

    //limpar sala caso nao exista mais usuarios
    if (room.users.size === 0) {
      this.rooms.delete(roomId)
      return
    }

    const disconnectedUserWasAnOwner = userId === room.owner.id
    const onlyOneUserLeft = room.users.size === 1

    if (onlyOneUserLeft || disconnectedUserWasAnOwner) {
      room.owner = this.#getNewRoomOwner(socket, room)
    }

    this.rooms.set(roomId, room)
    socket.to(room.id).emit(constants.events.USER_DISCONNECTED, user)
  }
  #notifyUserProfileUpgrade(socket, roomId, user) {
    socket.to(roomId).emit(constants.events.UPGRADE_USER_PERMISSION, user)
  }
  #getNewRoomOwner(socket, room) {
    console.log('new room users', room.users.values())
    const users = [...room.users.values()]
    const activeSpeakers = users.find((user) => user.isSpeaker)
    // se quem desconectou era o dono, passa a lideranca para o proximo
    const [newOwner] = activeSpeakers ? [activeSpeakers] : users
    newOwner.isSpeaker = true

    const outDatedUser = this.#users.get(newOwner.id)
    const updatedUser = new Attendee({
      ...outDatedUser,
      ...newOwner,
    })

    this.#users.set(newOwner.id, updatedUser)
    this.#notifyUserProfileUpgrade(socket, room.id, newOwner)
    return updatedUser
  }
  joinRoom(socket, { user, room }) {
    const userId = (user.id = socket.id)
    const roomId = room.id

    const userData = this.#updateGlobalUserData(userId, user, roomId)
    const updatedRoom = this.#joinUserRoom(socket, userData, room)
    this.#notifyUsersOnRoom(socket, roomId, userData)
    this.#replyWithActiveUsers(socket, [...updatedRoom.users.values()])
  }
  #replyWithActiveUsers(socket, users) {
    const event = constants.events.LOBBY_UPDATED
    socket.emit(event, users)
  }
  #notifyUsersOnRoom(socket, roomId, user) {
    const event = constants.events.USER_CONNECTED
    socket.to(roomId).emit(event, user)
  }
  #joinUserRoom(socket, user, room) {
    const roomId = room.id
    const existingRoom = this.rooms.has(roomId)
    const currentRoom = existingRoom ? this.rooms.get(roomId) : {}
    const currentUser = new Attendee({
      ...user,
      roomId,
    })

    // Definir quem e o dono da sala
    const [owner, users] = existingRoom
      ? [currentRoom.owner, currentRoom.users]
      : [currentUser, new Set()]

    const updatedRoom = this.#mapRoom({
      ...currentRoom,
      ...room,
      owner,
      users: new Set([...users, ...[currentUser]]),
    })

    this.rooms.set(roomId, updatedRoom)

    socket.join(roomId)

    return this.rooms.get(roomId)
  }
  #mapRoom(room) {
    const users = [...room.users.values()]
    const speakersCount = users.filter((user) => user.isSpeaker).length
    const featuredAttendees = users.slice(0, 3)
    const mappedRoom = new Room({
      ...room,
      speakersCount,
      featuredAttendees,
      attendeesCount: room.users.size,
    })

    return mappedRoom
  }
  #updateGlobalUserData(userId, userData = {}, roomId = '') {
    const user = this.#users.get(userId) ?? {}
    const existingRoom = this.rooms.has(roomId)

    const updatedUserData = new Attendee({
      ...user,
      ...userData,
      roomId,
      // se for o unico na sala
      isSpeaker: !existingRoom,
    })

    this.#users.set(userId, updatedUserData)

    return this.#users.get(userId)
  }
  getEvents() {
    const functions = Reflect.ownKeys(RoomsController.prototype)
      .filter((fn) => fn !== 'constructor')
      .map((name) => [name, this[name].bind(this)])

    return new Map(functions)
  }
}
