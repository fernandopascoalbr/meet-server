# ClubHouse Clone Template

## Preview

### Página de Login

## Checklist Features

- [ ] O app deve funcionar na Web, Android e IOS
- Login

  - [ ] Deve ter login com GitHub
    - [ ] Se houver dados do usuario em localStorage deve ir para lobby direto

- Lobby
  - [x] Mostra todas as salas ativas
  - [x] Atualiza salas em realtime
  - [x] Pode criar uma sala sem topico
  - [x] Pode criar uma sala com topico
  - [x] Pode acessar salas ativas
- Room
  - [x] Cria uma sala com um usuário dono
  - [x] Todos usuários futuros entram com perfil de attendees
  - [x] Notifica Lobby sobre atualizações na sala
  - [x] Lista usuarios com perfis de speakers e attendees
  - [x] Se o dono da sala desconectar, será removida
  - Users
    - Speaker
      - [ ] Recebe notificação de attendees para se tornarem speakers
      - [x] Upgrade de attendee para speaker
      - Se dono da sala
        - [ ] Pode aprovar attendees a virarem speakers
        - Ao se desconectar
          - [ ] Promove o speaker mais velho da sala
          - [x] Se não houver speaker promove o attendee mais velho da sala
    - Attendee
      - [ ] Pode pedir upgrade de perfil ao dono da sala
        - Ao ser aprovado
          - [ ] Reinicia todas as suas chamas ativas com os usuarios da sala
          - [ ] Recebe as permissões do perfil speaker
