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

/** Animation graph for entity. */

import { Mesh } from 'three'

import { EditorControlFunctions } from '@etherealengine/editor/src/functions/EditorControlFunctions'
import { Engine } from '@etherealengine/engine/src/ecs/classes/Engine'

import { AssetLoader } from '../../assets/classes/AssetLoader'
import { getComponent } from '../../ecs/functions/ComponentFunctions'
import { AvatarComponent } from '../components/AvatarComponent'
import { AnimationState, enterAnimationState, updateAnimationState } from './AnimationState'
import { AnimationStateTransitionRule } from './AnimationStateTransitionsRule'

export type AnimationGraph = {
  states: { [key: string]: AnimationState }
  transitionRules: { [key: string]: { rule: AnimationStateTransitionRule; nextState: string }[] }
  currentState: AnimationState
  stateChanged: (name: string, graph: AnimationGraph) => void | null
}

export function updateAnimationGraph(graph: AnimationGraph, delta: number) {
  if (graph.currentState) {
    const transitions = graph.transitionRules[graph.currentState.name]

    if (transitions) {
      for (const { rule, nextState } of transitions) {
        if (rule()) {
          changeState(graph, nextState)
        }
      }
    }
  }

  updateAnimationState(graph.currentState, delta)
}

export function changeState(graph: AnimationGraph, name: string): void {
  const newState = graph.states[name]
  if ((graph.currentState && graph.currentState.name === name) || !newState) return
  const prevState = graph.currentState
  const anims = ['LAUGH', 'CRY', 'DEFEAT', 'CLAP', 'WAVE']
  if (anims.includes(prevState.name)) {
    const entity = Engine.instance.localClientEntity
    const avatar = getComponent(entity, AvatarComponent)
    const hier = avatar.model?.children[0].children[0].children[0].children.find((child) => child.name === 'head')
    const id = hier?.uuid
    const mesh = hier as Mesh
    const changeToDefault = async () => {
      const prop = await AssetLoader.loadAsync(
        `${process.env.VITE_FILE_SERVER}/projects/default-project/assets/SGT_diffse_2.png`
      )
      EditorControlFunctions.modifyMaterial([id], mesh.material.uuid, [{ ['map']: prop }])
    }
    changeToDefault()
  }
  graph.currentState = newState

  // Animation corner case regarding 'multiple animations sequence issue'
  if (
    (newState.name == 'CLAP' ||
      newState.name == 'CRY' ||
      newState.name == 'KICK' ||
      newState.name == 'KISS' ||
      newState.name == 'WAVE' ||
      newState.name == 'LAUGH' ||
      newState.name == 'DEFEAT') &&
    prevState.name == 'LOCOMOTION'
  ) {
    localStorage.removeItem('dynamic')
  }

  enterAnimationState(graph.currentState, prevState)
  if (graph.stateChanged) graph.stateChanged(name, graph)
}
