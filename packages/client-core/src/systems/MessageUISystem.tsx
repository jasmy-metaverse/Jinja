/*
CPAL-1.0 License

The contents of this file are subject to the Common Public Attribution License
Version 1.0. (the "License"); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
https://github.com/EtherealEngine/etherealengine/blob/dev/LICENSE.
The License is based on the Mozilla Public License Version 1.1, but Sections 14
and 15 have been added to cover use of software over a computer network and 
provide for limited attribution for the Original Developer. In addition, 
Exhibit A has been modified to be consistent with Exhibit B.

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
specific language governing rights and limitations under the License.

The Original Code is Ethereal Engine.

The Original Developer is the Initial Developer. The Initial Developer of the
Original Code is the Ethereal Engine team.

All portions of the code written by the Ethereal Engine team are Copyright © 2021-2023 
Ethereal Engine. All Rights Reserved.
*/

import { Matrix4, Quaternion, Vector3 } from 'three'

import { AvatarComponent } from '@etherealengine/engine/src/avatar/components/AvatarComponent'
import { V_010 } from '@etherealengine/engine/src/common/constants/MathConstants'
import { Engine } from '@etherealengine/engine/src/ecs/classes/Engine'
import { EngineState } from '@etherealengine/engine/src/ecs/classes/EngineState'
import { Entity } from '@etherealengine/engine/src/ecs/classes/Entity'
import { getComponent, setComponent } from '@etherealengine/engine/src/ecs/functions/ComponentFunctions'
import { defineSystem } from '@etherealengine/engine/src/ecs/functions/SystemFunctions'
import { NetworkObjectComponent } from '@etherealengine/engine/src/networking/components/NetworkObjectComponent'
import { TransformComponent } from '@etherealengine/engine/src/transform/components/TransformComponent'
import { getState } from '@etherealengine/hyperflux'

import { createCoinButtonView, createCoinMessageView, createCoinView } from './ui/CoinView'
import { createMessageView } from './ui/MessageView'

export const MessageUI = new Map<Entity, ReturnType<typeof createMessageView>>()
export const CoinUI = new Map<Entity, ReturnType<typeof createCoinView>>()
export const CoinMessageUI = new Map<Entity, ReturnType<typeof createCoinMessageView>>()

var setTimer = true
const coinDisplayInterval = 5.3
localStorage.setItem('coinDisplayInterval', coinDisplayInterval.toString())
const throwDuration = 6
localStorage.setItem('throwDuration', throwDuration.toString())
localStorage.setItem('displayCoin', 'False')
localStorage.setItem('displayCoinResult', 'False')
localStorage.setItem('coinTossResult', 'Head')
localStorage.setItem('walkToShrineGate', 'False')
localStorage.setItem('shrine', 'True')
localStorage.setItem('onBow', 'False')

let message_ui = null
let coin_ui = null
let coin_message_ui = null
let coin_button_ui = null
let coins = []
let messageView = true
let coinButtonView = true

const fortuneMessage1 =
  'ドリブルのように一歩一歩、あなたの夢もゆっくりでも確実に進んでいるウィン。一歩一歩が大事ウィン。'
const fortuneMessage2 = '「分厚い本を読む」と知識と一緒に運も身につくかもしれないウィン。本を読むのは楽しいウィンね。'
const fortuneMessage3 =
  '「ロック」を聴くと、感性が刺激され、心が躍り出すウィン。好きな曲に耳を傾けることで、リラックスや集中力の向上が期待できるウィン。'
const fortuneMessage = [fortuneMessage1, fortuneMessage2, fortuneMessage3]

let h_ = 0
let n_ = 0
const x_ = -0.6591593623161316
const z_ = -50.76451873779297

let startTime = 0

/** XRUI Clickaway */

const execute = () => {
  if (localStorage.getItem('shrine') != 'True') return

  const engineState = getState(EngineState)
  if (!engineState.isEngineInitialized) return

  if (Engine.instance.localClientEntity) {
    const uEntity = Engine.instance.localClientEntity
    const avatar = getComponent(uEntity, AvatarComponent)
    const uId = getComponent(uEntity, NetworkObjectComponent).ownerId
    const aT = getComponent(uEntity, TransformComponent).position
    const aH = avatar.avatarHeight

    // welcome message ui set
    if (message_ui == null) {
      message_ui = createMessageView(uId)
      message_ui.container.position.x = x_ - 1.7
      message_ui.container.position.y = aH + 0.8
      message_ui.container.position.z = z_ - 2.5
      message_ui.state.messagePreview.position.value.x = x_ - 1.7
      message_ui.state.messagePreview.position.value.y = aH + 0.8
      message_ui.state.messagePreview.position.value.z = z_ - 2.5
    }

    // coin button ui set
    if (coin_button_ui == null) {
      coin_button_ui = createCoinButtonView(uId)
      coin_button_ui.container.visible = false
      coin_button_ui.container.position.x = x_
      coin_button_ui.container.position.y = aT.y + 1.5
      coin_button_ui.container.position.z = z_ - 1
      coin_button_ui.state.coinButtonPreview.position.value.x = x_
      coin_button_ui.state.coinButtonPreview.position.value.y = aT.y + 1.5
      coin_button_ui.state.coinButtonPreview.position.value.z = z_ - 1
    }

    // coin ui set
    if (coin_ui == null) {
      let hh = 0.0
      while (hh <= aT.y + aH) {
        coin_ui = createCoinView(uId)
        coin_ui.container.visible = false
        coin_ui.container.position.x = x_ + 0.2
        coin_ui.container.position.y = aT.y + aH - hh
        coin_ui.container.position.z = z_ - 0.8
        coin_ui.state.coinPreview.position.value.x = x_ + 0.2
        coin_ui.state.coinPreview.position.value.y = aT.y + aH - hh
        coin_ui.state.coinPreview.position.value.z = z_ - 0.8
        hh += 0.03
        coins.push(coin_ui)
      }
      h_ = coins.length
    }

    // welcome message display start

    const dx = x_ - aT.x
    const dz = z_ - aT.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    if (distance < 10) {
      message_ui.container.visible = messageView
      coin_button_ui.container.visible = false
      // coin_button_ui.container.visible = coinButtonView
    } else {
      message_ui.container.visible = false
      coin_button_ui.container.visible = false
    }

    if (localStorage.getItem('displayCoinResult') == 'False') {
      if (coin_message_ui != null) {
        coin_message_ui.container.visible = false
      }
      localStorage.setItem('displayCoinResult', 'True')
      coin_message_ui = null
    }

    // coin display start
    if (localStorage.getItem('displayCoin') == 'True') {
      messageView = false
      coinButtonView = false
      if (setTimer) {
        startTime = new Date().getTime() / 1000
        setTimer = false
      } else {
        let duration = localStorage.getItem('throwDuration').toString()
        let now = new Date().getTime() / 1000
        let duration_ = parseFloat(duration) - coinDisplayInterval

        if (now - startTime > duration_) {
          if (h_ == n_) {
            coins[n_ - 1].container.visible = false
            localStorage.setItem('displayCoin', 'False')
            localStorage.setItem('displayCoinResult', 'True')
            let coin_toss = Math.floor(Math.random() * 3)
            localStorage.setItem('coinTossResult', fortuneMessage[coin_toss])

            // let coin_toss = Math.floor((Math.random() * 2))
            // if (coin_toss){
            //   localStorage.setItem('coinTossResult', 'Head')
            // }
            // else{
            //   localStorage.setItem('coinTossResult', 'Tail')
            // }
            // coin message ui set
            coin_message_ui = createCoinMessageView(uId)
            coin_message_ui.container.position.x = x_ - 1.7
            coin_message_ui.container.position.y = aH + 0.8
            coin_message_ui.container.position.z = z_ - 2.22
            coin_message_ui.state.coinMessagePreview.position.value.x = x_ - 1.7
            coin_message_ui.state.coinMessagePreview.position.value.y = 2.5
            coin_message_ui.state.coinMessagePreview.position.value.z = z_ - 2.22
            coin_message_ui.container.visible = false
            if (localStorage.getItem('onBow') == 'True') {
              setTimeout(() => {
                coin_message_ui.container.visible = true
              }, 2500)
            } else coin_message_ui.container.visible = true
            // setTimeout(function () {
            //   coin_message_ui.container.visible = false
            //   localStorage.setItem('displayCoinResult', 'False')
            //   coin_message_ui = null
            //   coinButtonView = true
            // }, 12000)
            setTimer = true
            n_ = 0
          } else {
            if (localStorage.getItem('onBow') == 'False') {
              coins[n_].container.visible = true
              if (n_ > 0) {
                coins[n_ - 1].container.visible = false
              }
            }
            n_ += 1
          }
        }
      }
    } else if (distance >= 1) {
      localStorage.setItem('displayCoinResult', 'False')
    }
  }
}

export const MessageUISystem = defineSystem({
  uuid: 'ee.client.MessageUISystem',
  execute
})
