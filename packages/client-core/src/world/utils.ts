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

import config from '@etherealengine/common/src/config'
import { SceneJson } from '@etherealengine/common/src/interfaces/SceneInterface'
import { SceneState } from '@etherealengine/engine/src/ecs/classes/Scene'
import { getMutableState } from '@etherealengine/hyperflux'

const sceneRelativePathIdentifier = '__$project$__'
const sceneCorsPathIdentifier = '__$cors-proxy$__'
const fileServer = config.client.fileServer ?? `${process.env.VITE_FILE_SERVER}`
const corsPath = config.client.cors.serverPort
  ? config.client.cors.proxyUrl
  : `https://${process.env['VITE_SERVER_HOST']}:${process.env['VITE_CORS_SERVER_PORT']}`

const parseSceneDataCacheURLsLocal = (projectName: string, sceneData: any) => {
  for (const [key, val] of Object.entries(sceneData)) {
    if (val && typeof val === 'object') {
      sceneData[key] = parseSceneDataCacheURLsLocal(projectName, val)
    }
    if (typeof val === 'string') {
      if (val.includes(sceneRelativePathIdentifier)) {
        sceneData[key] = `${fileServer}/projects` + sceneData[key].replace(sceneRelativePathIdentifier, '')
      }
      if (val.startsWith(sceneCorsPathIdentifier)) {
        sceneData[key] = sceneData[key].replace(sceneCorsPathIdentifier, corsPath)
      }
    }
  }
  return sceneData
}

export const loadSceneJsonOffline = async (projectName, sceneName) => {
  const locationName = `${projectName}/${sceneName}`
  const sceneData = (await (await fetch(`${fileServer}/projects/${locationName}.scene.json`)).json()) as SceneJson
  const hasKTX2 = await fetch(`${fileServer}/projects/${locationName}.thumbnail.ktx2`).then((res) => res.ok)
  getMutableState(SceneState).sceneData.set({
    scene: parseSceneDataCacheURLsLocal(projectName, sceneData),
    name: sceneName,
    thumbnailUrl: `${fileServer}/projects/${locationName}.thumbnail.${hasKTX2 ? 'ktx2' : 'jpeg'}`,
    project: projectName
  })
}
