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

import { Location } from '@etherealengine/common/src/interfaces/Location'

import { locationSettingsSeed } from '../location-settings/location-settings.seed'

export const locationSeed = {
  path: 'location',
  insertSingle: true,
  templates: [
    {
      id: '98cbcc30-fd2d-11ea-bc7c-cd4cac9a8d60',
      name: 'Dancing',
      slugifiedName: 'dancing',
      maxUsersPerInstance: 30,
      sceneId: 'default-project/default',
      location_settings: locationSettingsSeed.templates.find(
        (template) => template.locationId === '98cbcc30-fd2d-11ea-bc7c-cd4cac9a8d60'
      ),
      isLobby: false
    } as Location,
    {
      id: '98cbcc30-fd2d-11ea-bc7c-cd4cac9a8d62',
      name: 'Sky Station',
      slugifiedName: 'sky-station',
      maxUsersPerInstance: 30,
      sceneId: 'default-project/sky-station',
      location_settings: locationSettingsSeed.templates.find(
        (template) => template.locationId === '98cbcc30-fd2d-11ea-bc7c-cd4cac9a8d62'
      ),
      isLobby: false
    } as Location,
    {
      id: '98cbcc30-fd2d-11ea-bc7c-cd4cac9a8d63',
      name: 'Apartment',
      slugifiedName: 'apartment',
      maxUsersPerInstance: 30,
      sceneId: 'default-project/apartment',
      location_settings: locationSettingsSeed.templates.find(
        (template) => template.locationId === '98cbcc30-fd2d-11ea-bc7c-cd4cac9a8d63'
      ),
      isLobby: false
    } as Location,
    {
      id: '98cbcc30-fd2d-11ea-bc7c-cd4cac9a8d64',
      name: 'Football',
      slugifiedName: 'football',
      maxUsersPerInstance: 30,
      sceneId: 'default-project/football',
      location_settings: locationSettingsSeed.templates.find(
        (template) => template.locationId === '98cbcc30-fd2d-11ea-bc7c-cd4cac9a8d64'
      ),
      isLobby: false
    } as Location,
    {
      id: '98cbcc30-fd2d-11ea-bc7c-cd4cac9a8d65',
      name: 'Default',
      slugifiedName: 'default',
      maxUsersPerInstance: 30,
      sceneId: 'default-project/shrine',
      location_settings: locationSettingsSeed.templates.find(
        (template) => template.locationId === '98cbcc30-fd2d-11ea-bc7c-cd4cac9a8d65'
      ),
      isLobby: false
    } as Location
  ]
}
