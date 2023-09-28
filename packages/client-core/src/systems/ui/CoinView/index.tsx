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

import React from 'react'
import { BoxGeometry, CircleGeometry, ImageLoader, Mesh, MeshBasicMaterial } from 'three'

import { addComponent } from '@etherealengine/engine/src/ecs/functions/ComponentFunctions'
import { NameComponent } from '@etherealengine/engine/src/scene/components/NameComponent'
import { createXRUI } from '@etherealengine/engine/src/xrui/functions/createXRUI'
import { createState } from '@etherealengine/hyperflux'

import styleString from './index.scss?inline'

export function createCoinView(id: string) {
  const coinPreview = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 0xffff00 }))
  const ui = createXRUI(
    CoinView,
    createState({
      id,
      coinPreview
    })
  )
  addComponent(ui.entity, NameComponent, 'coin-detail-ui-' + id)
  return ui
}

const CoinView = () => {
  return (
    <>
      <img src="/static/Coin_100__.png" alt="Coin" />
    </>
  )
}

export function createCoinMessageView(id: string) {
  const coinMessagePreview = new Mesh(new CircleGeometry(1, 32), new MeshBasicMaterial())
  const ui = createXRUI(
    CoinMessageView,
    createState({
      id,
      coinMessagePreview
    })
  )
  addComponent(ui.entity, NameComponent, 'coin-message-detail-ui-' + id)
  return ui
}

const CoinMessageView = () => {
  return (
    <>
      <link href="https://fonts.googleapis.com/css?family=Lato:400" rel="stylesheet" type="text/css" />
      <style>{styleString}</style>
      <div className="coinMessage">
        <div>{localStorage.getItem('coinTossResult')}</div>
      </div>
    </>
  )
}

export function createCoinButtonView(id: string) {
  const coinButtonPreview = new Mesh(new CircleGeometry(1, 32), new MeshBasicMaterial())
  const ui = createXRUI(
    CoinButtonView,
    createState({
      id,
      coinButtonPreview
    })
  )
  addComponent(ui.entity, NameComponent, 'coin-button-ui-' + id)
  return ui
}

const CoinButtonView = () => {
  return <img src="/static/Coin_100__.png" alt="Coin" />
}
