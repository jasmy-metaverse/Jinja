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

// import * as polyfill from 'credential-handler-polyfill'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import Avatar from '@etherealengine/client-core/src/common/components/Avatar'
import Button from '@etherealengine/client-core/src/common/components/Button'
import commonStyles from '@etherealengine/client-core/src/common/components/common.module.scss'
import ConfirmDialog from '@etherealengine/client-core/src/common/components/ConfirmDialog'
import { DiscordIcon } from '@etherealengine/client-core/src/common/components/Icons/DiscordIcon'
import { FacebookIcon } from '@etherealengine/client-core/src/common/components/Icons/FacebookIcon'
import { GithubIcon } from '@etherealengine/client-core/src/common/components/Icons/GithubIcon'
import { GoogleIcon } from '@etherealengine/client-core/src/common/components/Icons/GoogleIcon'
import { KeycloakIcon } from '@etherealengine/client-core/src/common/components/Icons/KeycloakIcon'
import { LinkedInIcon } from '@etherealengine/client-core/src/common/components/Icons/LinkedInIcon'
import { TwitterIcon } from '@etherealengine/client-core/src/common/components/Icons/TwitterIcon'
import InputText from '@etherealengine/client-core/src/common/components/InputText'
import Menu from '@etherealengine/client-core/src/common/components/Menu'
import Text from '@etherealengine/client-core/src/common/components/Text'
import { validateEmail, validatePhoneNumber } from '@etherealengine/common/src/config'
import multiLogger from '@etherealengine/common/src/logger'
import { EngineState } from '@etherealengine/engine/src/ecs/classes/EngineState'
import { WorldState } from '@etherealengine/engine/src/networking/interfaces/WorldState'
import { getMutableState, useHookstate } from '@etherealengine/hyperflux'
import Box from '@etherealengine/ui/src/primitives/mui/Box'
import CircularProgress from '@etherealengine/ui/src/primitives/mui/CircularProgress'
import Icon from '@etherealengine/ui/src/primitives/mui/Icon'
import IconButton from '@etherealengine/ui/src/primitives/mui/IconButton'

import { AuthSettingsState } from '../../../../admin/services/Setting/AuthSettingService'
import { initialAuthState, initialOAuthConnectedState } from '../../../../common/initialAuthState'
import { NotificationService } from '../../../../common/services/NotificationService'
import { useUserAvatarThumbnail } from '../../../functions/useUserAvatarThumbnail'
import { AuthService, AuthState } from '../../../services/AuthService'
import { AvatarService } from '../../../services/AvatarService'
import { UserMenus } from '../../../UserUISystem'
import styles from '../index.module.scss'
import { PopupMenuServices } from '../PopupMenuService'

const logger = multiLogger.child({ component: 'client-core:ProfileMenu' })

interface Props {
  className?: string
  hideLogin?: boolean
  isPopover?: boolean
  onClose?: () => void
}

const ProfileMenu = ({ hideLogin, onClose, isPopover }: Props): JSX.Element => {
  const { t } = useTranslation()
  const location = useLocation()

  const selfUser = useHookstate(getMutableState(AuthState).user)

  const username = useHookstate(selfUser?.name.value)
  const emailPhone = useHookstate('')
  const error = useHookstate(false)
  const errorUsername = useHookstate('')
  const showUserId = useHookstate(false)
  const showApiKey = useHookstate(false)
  const showDeleteAccount = useHookstate(false)
  const oauthConnectedState = useHookstate(Object.assign({}, initialOAuthConnectedState))
  const authState = useHookstate(initialAuthState)

  const engineInitialized = useHookstate(getMutableState(EngineState).isEngineInitialized)
  const authSettingState = useHookstate(getMutableState(AuthSettingsState))
  const [authSetting] = authSettingState?.authSettings?.value || []
  const loading = useHookstate(getMutableState(AuthState).isProcessing)
  const userId = selfUser.id.value
  const apiKey = selfUser.apiKey?.token?.value
  const isGuest = false

  const hasAdminAccess =
    selfUser?.id?.value?.length > 0 && selfUser?.scopes?.value?.find((scope) => scope.type === 'admin:admin')
  const avatarThumbnail = useUserAvatarThumbnail(userId)

  useEffect(() => {
    if (authSetting) {
      let temp = { ...initialAuthState }
      authSetting?.authStrategies?.forEach((el) => {
        Object.entries(el).forEach(([strategyName, strategy]) => {
          temp[strategyName] = strategy
        })
      })
      authState.set(temp)
    }
  }, [authSettingState?.updateNeeded?.value])

  let type = ''
  const addMoreSocial =
    (authState?.value?.discord && !oauthConnectedState.discord.value) ||
    (authState?.value?.facebook && !oauthConnectedState.facebook.value) ||
    (authState?.value?.github && !oauthConnectedState.github.value) ||
    (authState?.value?.google && !oauthConnectedState.google.value) ||
    (authState?.value?.linkedin && !oauthConnectedState.linkedin.value) ||
    (authState?.value?.twitter && !oauthConnectedState.twitter.value)

  const removeSocial = Object.values(oauthConnectedState.value).filter((value) => value).length >= 1

  // const loadCredentialHandler = async () => {
  //   try {
  //     const mediator = config.client.mediatorServer + `/mediator?origin=${encodeURIComponent(window.location.origin)}`

  //     await polyfill.loadOnce(mediator)
  //     console.log('Ready to work with credentials!')
  //   } catch (e) {
  //     logger.error(e, 'Error loading polyfill')
  //   }
  // }

  // useEffect(() => {
  //   loadCredentialHandler()
  // }, []) // Only run once

  useEffect(() => {
    selfUser && username.set(selfUser.name.value)
  }, [selfUser.name.value])

  useEffect(() => {
    oauthConnectedState.set(Object.assign({}, initialOAuthConnectedState))
    if (selfUser.identityProviders.get({ noproxy: true }))
      for (let ip of selfUser.identityProviders.get({ noproxy: true })!) {
        switch (ip.type) {
          case 'discord':
            oauthConnectedState.merge({ discord: true })
            break
          case 'facebook':
            oauthConnectedState.merge({ facebook: true })
            break
          case 'linkedin':
            oauthConnectedState.merge({ linkedin: true })
            break
          case 'google':
            oauthConnectedState.merge({ google: true })
            break
          case 'twitter':
            oauthConnectedState.merge({ twitter: true })
            break
          case 'github':
            oauthConnectedState.merge({ github: true })
            break
          case 'keycloak':
            oauthConnectedState.merge({ keycloak: true })
            break
        }
      }
  }, [selfUser.identityProviders])

  const updateUserName = (e) => {
    e.preventDefault()
    handleUpdateUsername()
  }

  const deleteAccount = () => {
    showDeleteAccount.set(true)
    localStorage.removeItem('keycloakUser')
    localStorage.removeItem('ComfirmSelected')
  }

  const handleUsernameChange = (e) => {
    username.set(e.target.value)
    if (!e.target.value) errorUsername.set(t('user:usermenu.profile.usernameError'))
    else errorUsername.set('')
  }

  const handleUpdateUsername = () => {
    const name = username.value.trim()
    if (!name) return
    if (selfUser.name.value.trim() !== name) {
      // @ts-ignore
      AuthService.updateUsername(userId, name)
    }
  }
  const handleInputChange = (e) => emailPhone.set(e.target.value)

  const validate = () => {
    if (emailPhone.value === '') return false
    if (validateEmail(emailPhone.value.trim()) && authState?.value?.emailMagicLink) type = 'email'
    else if (validatePhoneNumber(emailPhone.value.trim()) && authState?.value?.smsMagicLink) type = 'sms'
    else {
      error.set(true)
      return false
    }

    error.set(false)
    return true
  }

  const handleGuestSubmit = (e: any): any => {
    e.preventDefault()
    if (!validate()) return
    if (type === 'email') AuthService.createMagicLink(emailPhone.value, authState?.value, 'email')
    else if (type === 'sms') AuthService.createMagicLink(emailPhone.value, authState?.value, 'sms')
    return
  }

  const handleOAuthServiceClick = (e) => {
    if (!localStorage.getItem('keycloakUser')) {
      AuthService.loginUserByOAuth(e.currentTarget.id, location)
    }
  }

  const handleRemoveOAuthServiceClick = (e) => {
    AuthService.removeUserOAuth(e.currentTarget.id)
  }

  const handleLogout = async () => {
    // PopupMenuServices.showPopupMenu(UserMenus.Profile)
    // if (onClose) onClose()
    // showUserId.set(false)
    // showApiKey.set(false)
    // await AuthService.logoutUser()
    // oauthConnectedState.set(Object.assign({}, initialOAuthConnectedState))
    // setTimeout(() => {
    //   const url = window.location.href
    //   const urlWithoutQueryString = url.split('?')[0]
    //   window.location.href = urlWithoutQueryString
    //   console.log(urlWithoutQueryString)
    // }, 1000)

    const url = window.location.href
    const urlWithoutQueryString = url.split('?')[0]
    // window.location.href = `${urlWithoutQueryString}?logout`
    window.location.href = `${process.env.VITE_PORTAL_DANCING_LOCATION}?code=${localStorage.getItem(
      'userCode'
    )}&&username=${localStorage.getItem('username')}&&avatarname=${localStorage.getItem('avatarname')}&&logout`
    console.log(urlWithoutQueryString)
  }

  /**
   * Example function, issues a Verifiable Credential, and uses the Credential
   * Handler API (CHAPI) to request to store this VC in the user's wallet.
   *
   * This is here in the ProfileMenu just for convenience -- it can be invoked
   * by the client (browser) whenever appropriate (whenever a user performs
   * some in-engine action, makes a payment, etc).
   */
  async function handleIssueCredentialClick() {
    /** @todo temporarily disabled for vite upgrade #6453 */
    // const signedVp = await requestVcForEvent('EnteredVolumeEvent')
    // console.log('Issued VC:', JSON.stringify(signedVp, null, 2))
    // const webCredentialType = 'VerifiablePresentation'
    // // @ts-ignore
    // const webCredentialWrapper = new window.WebCredential(webCredentialType, signedVp, {
    //   recommendedHandlerOrigins: ['https://uniwallet.cloud']
    // })
    // // Use Credential Handler API to store
    // const result = await navigator.credentials.store(webCredentialWrapper)
    // console.log('Result of receiving via store() request:', result)
  }

  /**
   * Example function, requests a Verifiable Credential from the user's wallet.
   */
  async function handleRequestCredentialClick() {
    // const result = await navigator.credentials.get(vpRequestQuery)
    // console.log('VC Request query result:', result)
  }

  async function handleWalletLoginClick() {
    const domain = window.location.origin
    const challenge = '99612b24-63d9-11ea-b99f-4f66f3e4f81a' // TODO: generate

    console.log('Sending DIDAuth query...')

    const didAuthQuery: any = {
      web: {
        VerifiablePresentation: {
          query: [
            {
              type: 'DIDAuth' // request the controller's DID
            },
            {
              type: 'QueryByExample',
              credentialQuery: [
                {
                  example: {
                    '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/xr/v1'],
                    // contains username and avatar icon
                    type: 'LoginDisplayCredential'
                  }
                },
                {
                  example: {
                    '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/xr/v1'],
                    // various Ethereal Engine user preferences
                    type: 'UserPreferencesCredential'
                  }
                }
              ]
            }
          ],
          challenge,
          domain // e.g.: requestingparty.example.com
        }
      }
    }

    // Use Credential Handler API to authenticate and receive basic login display credentials
    const vprResult: any = await navigator.credentials.get(didAuthQuery)
    console.log(vprResult)

    AuthService.loginUserByXRWallet(vprResult)
  }

  const refreshApiKey = () => {
    AuthService.updateApiKey()
  }

  const getConnectText = () => {
    if (authState?.value?.emailMagicLink && authState?.value?.smsMagicLink) {
      return t('user:usermenu.profile.connectPhoneEmail')
    } else if (authState?.value?.emailMagicLink && !authState?.value?.smsMagicLink) {
      return t('user:usermenu.profile.connectEmail')
    } else if (!authState?.value?.emailMagicLink && authState?.value?.smsMagicLink) {
      return t('user:usermenu.profile.connectPhone')
    } else {
      return ''
    }
  }

  const getErrorText = () => {
    if (authState?.value?.emailMagicLink && authState?.value?.smsMagicLink) {
      return t('user:usermenu.profile.phoneEmailError')
    } else if (authState?.value?.emailMagicLink && !authState?.value?.smsMagicLink) {
      return t('user:usermenu.profile.emailError')
    } else if (!authState?.value?.emailMagicLink && authState?.value?.smsMagicLink) {
      return t('user:usermenu.profile.phoneError')
    } else {
      return ''
    }
  }

  const getConnectPlaceholder = () => {
    if (authState?.value?.emailMagicLink && authState?.value?.smsMagicLink) {
      return t('user:usermenu.profile.ph-phoneEmail')
    } else if (authState?.value?.emailMagicLink && !authState?.value?.smsMagicLink) {
      return t('user:usermenu.profile.ph-email')
    } else if (!authState?.value?.emailMagicLink && authState?.value?.smsMagicLink) {
      return t('user:usermenu.profile.ph-phone')
    } else {
      return ''
    }
  }

  const enableWalletLogin = false // authState?.didWallet

  const enableSocial =
    authState?.value?.discord ||
    authState?.value?.facebook ||
    authState?.value?.github ||
    authState?.value?.google ||
    authState?.value?.linkedin ||
    authState?.value?.twitter

  const enableConnect = authState?.value?.emailMagicLink || authState?.value?.smsMagicLink

  let userName = ''
  try {
    const userInfo = JSON.parse(username.value)
    userName = userInfo.name
  } catch (e) {
    userName = username.value
  }

  return (
    <Menu open isPopover={isPopover} onClose={() => PopupMenuServices.showPopupMenu()}>
      <Box className={styles.menuContent}>
        <Box className={styles.profileContainer}>
          <Avatar
            imageSrc={avatarThumbnail}
            showChangeButton={!!engineInitialized.value}
            onChange={() => PopupMenuServices.showPopupMenu(UserMenus.AvatarSelect)}
          />

          <Box className={styles.profileDetails}>
            <Text variant="body2">
              <span className={commonStyles.bold}>
                {isGuest ? t('user:usermenu.profile.youAreAGuest') : t('user:usermenu.profile.youAreAUser')}
              </span>
              .
            </Text>

            {/* {selfUser?.inviteCode.value && (
              <Text mt={1} variant="body2">
                {t('user:usermenu.profile.inviteCode')}: {selfUser.inviteCode.value}
              </Text>
            )}

            <Text id="show-user-id" mt={1} variant="body2" onClick={() => showUserId.set(!showUserId.value)}>
              {showUserId.value ? t('user:usermenu.profile.hideUserId') : t('user:usermenu.profile.showUserId')}
            </Text> */}

            {selfUser?.apiKey?.id && (
              <Text variant="body2" mt={1} onClick={() => showApiKey.set(!showApiKey.value)}>
                {showApiKey.value ? t('user:usermenu.profile.hideApiKey') : t('user:usermenu.profile.showApiKey')}
              </Text>
            )}

            {/* {!isGuest && ( */}
            <Text variant="body2" mt={1} onClick={handleLogout}>
              {t('user:usermenu.profile.logout')}
            </Text>
            {/* )} */}
          </Box>

          {!isPopover && (
            <IconButton
              background="var(--textColor)"
              sizePx={80}
              icon={
                <Icon
                  type="Settings"
                  sx={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    margin: 'auto',
                    color: 'var(--inputBackground)'
                  }}
                />
              }
              onClick={() => PopupMenuServices.showPopupMenu(UserMenus.Settings)}
            />
          )}
        </Box>

        <InputText
          name="username"
          label={t('user:usermenu.profile.lbl-username')}
          // value={username.value || ''}
          value={userName || ''}
          readOnly={true}
          error={errorUsername.value}
          sx={{ mt: 4 }}
          // endIcon={<Icon type="Check" />}
          onEndIconClick={updateUserName}
          onChange={handleUsernameChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') updateUserName(e)
          }}
        />

        {showUserId.value && (
          <InputText
            id="user-id"
            label={t('user:usermenu.profile.userIcon.userId')}
            value={userId}
            sx={{ mt: 2 }}
            endIcon={<Icon type="ContentCopy" />}
            onEndIconClick={() => {
              navigator.clipboard.writeText(userId)
              NotificationService.dispatchNotify(t('user:usermenu.profile.userIdCopied'), {
                variant: 'success'
              })
            }}
          />
        )}

        {showApiKey.value && (
          <InputText
            label={t('user:usermenu.profile.apiKey')}
            value={apiKey}
            sx={{ mt: 2 }}
            endIcon={<Icon type="ContentCopy" />}
            startIcon={<Icon type="Refresh" />}
            startIconTitle={t('user:usermenu.profile.refreshApiKey')}
            onStartIconClick={refreshApiKey}
            onEndIconClick={() => {
              navigator.clipboard.writeText(apiKey)
              NotificationService.dispatchNotify(t('user:usermenu.profile.apiKeyCopied'), {
                variant: 'success'
              })
            }}
          />
        )}

        {!hideLogin && (
          <>
            {/* <div className="termsAndConditions">
              <a href={process.env.VITE_TERMS_CONDITIONS_LINK} target="_blank">
                Terms & Conditions
              </a>
            </div> */}
            {/* {isGuest && enableConnect && (
              <>
                <InputText
                  label={getConnectText()}
                  value={apiKey}
                  placeholder={getConnectPlaceholder()}
                  error={error.value ? getErrorText() : undefined}
                  sx={{ mt: 2 }}
                  endIcon={<Icon type="Send" />}
                  onEndIconClick={handleGuestSubmit}
                  onBlur={validate}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGuestSubmit(e)
                  }}
                />

                {loading.value && (
                  <Box display="flex" justifyContent="center">
                    <CircularProgress size={30} />
                  </Box>
                )}
              </>
            )} */}

            {/* {isGuest && enableWalletLogin && (
              <>
                <Text align="center" variant="body2" mb={1} mt={2}>
                  {t('user:usermenu.profile.or')}
                </Text>

                {enableWalletLogin && (
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <Button type="gradientRounded" onClick={() => handleWalletLoginClick()}>
                      {t('user:usermenu.profile.loginWithXRWallet')}
                    </Button>

                    <Box display="flex" columnGap={2} alignItems="center">
                      <Button type="gradientRounded" onClick={() => handleIssueCredentialClick()}>
                        {t('user:usermenu.profile.issueVC')}
                      </Button>

                      <Button type="gradientRounded" onClick={() => handleRequestCredentialClick()}>
                        {t('user:usermenu.profile.requestVC')}
                      </Button>
                    </Box>
                  </Box>
                )}
              </>
            )} */}

            {/* {enableSocial && (
              <>
                {selfUser?.isGuest.value && (
                  <Text align="center" variant="body2" mb={1} mt={2}>
                    {t('user:usermenu.profile.addSocial')}
                  </Text>
                )}

                <div className={styles.socialContainer}>
                  {authState?.value?.discord && !oauthConnectedState.discord.value && (
                    <IconButton
                      id="discord"
                      disabled={!selfUser?.isGuest.value && removeSocial}
                      icon={<DiscordIcon viewBox="0 0 40 40" />}
                      onClick={handleOAuthServiceClick}
                    />
                  )}
                  {authState?.value?.keycloak && !oauthConnectedState.keycloak.value && (
                    <IconButton
                      id="keycloak"
                      disabled={!selfUser?.isGuest.value && removeSocial}
                      icon={<KeycloakIcon />}
                      onClick={handleOAuthServiceClick}
                    />
                  )}
                  {authState?.value?.google && !oauthConnectedState.google.value && (
                    <IconButton
                      id="google"
                      disabled={!selfUser?.isGuest.value && removeSocial}
                      icon={<GoogleIcon viewBox="0 0 40 40" />}
                      onClick={handleOAuthServiceClick}
                    />
                  )}
                  {authState?.value?.facebook && !oauthConnectedState.facebook.value && (
                    <IconButton
                      id="facebook"
                      disabled={!selfUser?.isGuest.value && removeSocial}
                      icon={<FacebookIcon width="40" height="40" viewBox="0 0 40 40" />}
                      onClick={handleOAuthServiceClick}
                    />
                  )}
                  {authState?.value?.linkedin && !oauthConnectedState.linkedin.value && (
                    <IconButton
                      id="linkedin"
                      disabled={!selfUser?.isGuest.value && removeSocial}
                      icon={<LinkedInIcon viewBox="0 0 40 40" />}
                      onClick={handleOAuthServiceClick}
                    />
                  )}
                  {authState?.value?.twitter && !oauthConnectedState.twitter.value && (
                    <IconButton
                      id="twitter"
                      disabled={!selfUser?.isGuest.value && removeSocial}
                      icon={<TwitterIcon width="40" height="40" viewBox="0 0 40 40" />}
                      onClick={handleOAuthServiceClick}
                    />
                  )}
                  {authState?.value?.github && !oauthConnectedState.github.value && (
                    <IconButton
                      id="github"
                      disabled={!selfUser?.isGuest.value && removeSocial}
                      icon={<Icon type="GitHub" />}
                      onClick={handleOAuthServiceClick}
                    />
                  )}
                </div>

                {!selfUser?.isGuest.value && removeSocial && (
                  <>
                    <Text align="center" variant="body2" mb={1} mt={2}>
                      {t('user:usermenu.profile.removeSocial')}
                    </Text>

                    <div className={styles.socialContainer}>
                      {authState?.discord.value && oauthConnectedState.discord.value && (
                        <IconButton
                          id="discord"
                          icon={<DiscordIcon viewBox="0 0 40 40" />}
                          onClick={handleRemoveOAuthServiceClick}
                        />
                      )}
                      {authState?.keycloak.value && oauthConnectedState.keycloak.value && (
                        <IconButton id="keycloak" icon={<KeycloakIcon />} onClick={handleRemoveOAuthServiceClick} />
                      )}
                      {authState?.google.value && oauthConnectedState.google.value && (
                        <IconButton
                          id="google"
                          icon={<GoogleIcon viewBox="0 0 40 40" />}
                          onClick={handleRemoveOAuthServiceClick}
                        />
                      )}
                      {authState?.facebook.value && oauthConnectedState.facebook.value && (
                        <IconButton
                          id="facebook"
                          icon={<Icon type="Facebook" viewBox="0 0 40 40" />}
                          onClick={handleRemoveOAuthServiceClick}
                        />
                      )}
                      {authState?.linkedin.value && oauthConnectedState.linkedin.value && (
                        <IconButton
                          id="linkedin"
                          icon={<LinkedInIcon viewBox="0 0 40 40" />}
                          onClick={handleRemoveOAuthServiceClick}
                        />
                      )}
                      {authState?.twitter.value && oauthConnectedState.twitter.value && (
                        <IconButton
                          id="twitter"
                          icon={<Icon type="Twitter" viewBox="0 0 40 40" />}
                          onClick={handleRemoveOAuthServiceClick}
                        />
                      )}
                      {authState?.github.value && oauthConnectedState.github.value && (
                        <IconButton id="github" icon={<Icon type="GitHub" />} onClick={handleRemoveOAuthServiceClick} />
                      )}
                    </div>
                  </>
                )}
              </>
            )} */}

            {/* {!isGuest && (
              <Text id="delete-account" mb={1} variant="body2" onClick={() => deleteAccount()}>
                {t('user:usermenu.profile.delete.deleteAccount')}
              </Text>
            )} */}

            {showDeleteAccount.value && (
              <ConfirmDialog
                open
                description={
                  <>
                    <Text variant="body2">{t('user:usermenu.profile.delete.deleteControlsText')}</Text>
                    <Text variant="body2" color="red" mt={2}>
                      {t('user:usermenu.profile.delete.finalDeleteText')}
                    </Text>
                  </>
                }
                submitButtonText={t('user:usermenu.profile.delete.finalDeleteConfirm')}
                onClose={() => showDeleteAccount.set(false)}
                onSubmit={() => {
                  AuthService.removeUser(userId)
                  AuthService.logoutUser()
                  showDeleteAccount.set(false)
                }}
              />
            )}
          </>
        )}
      </Box>
    </Menu>
  )
}

export default ProfileMenu
