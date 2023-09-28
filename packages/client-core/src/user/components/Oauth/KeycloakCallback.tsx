import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { getMutableState, useHookstate } from '@etherealengine/hyperflux'
import Button from '@etherealengine/ui/src/primitives/mui/Button'
import Container from '@etherealengine/ui/src/primitives/mui/Container'

import { AuthService } from '../../services/AuthService'
import { AuthState } from '../../services/AuthService'
import styles from './styles.module.scss'

const KeycloakCallbackComponent = (props): JSX.Element => {
  const { t } = useTranslation()
  const initialState = { error: '', token: '' }
  const [state, setState] = useState(initialState)
  const search = new URLSearchParams(useLocation().search)

  useEffect(() => {
    localStorage.setItem('keycloakUser', 'true')
    const error = search.get('error') as string
    const token = search.get('token') as string
    const type = search.get('type') as string
    const path = search.get('path') as string
    const instanceId = search.get('instanceId') as string

    // Save the PDL access token in the local storage
    localStorage.setItem('pdl_access_token', search.get('pdl_access_token') as string)

    if (!error) {
      if (type === 'connection') {
        const user = useHookstate(getMutableState(AuthState)).user
        AuthService.refreshConnections(user.id.value!)
      } else {
        let redirectSuccess = `${path}`
        if (instanceId != null) redirectSuccess += `?instanceId=${instanceId}`
        AuthService.loginUserByJwt(token, redirectSuccess || '/', '/')
      }
    }

    setState({ ...state, error, token })
  }, [])

  function redirectToRoot() {
    localStorage.removeItem('keycloakUser')
    window.location.href = '/'
  }

  return state.error && state.error !== '' ? (
    <Container className={styles.oauthError}>
      <div className={styles.title}>{t('user:oauth.authFailed', { service: 'Keycloak' })}</div>
      <div className={styles.message}>{state.error}</div>
      <Button onClick={redirectToRoot} className={styles.gradientButton}>
        {t('user:oauth.redirectToRoot')}
      </Button>
    </Container>
  ) : (
    <Container>{t('user:oauth.authenticating')}</Container>
  )
}

export const KeycloakCallback = KeycloakCallbackComponent as any
