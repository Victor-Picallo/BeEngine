---
slug: cuenta-usuario
title: Cuenta, login y favoritos
scope: global
tags: login registro google contraseña favoritos perfil sesión
---

# Cuenta de usuario

## Acceso

- **Iniciar sesión / Crear cuenta**: `/login` (alias `/registro` → registro).
- **Email y contraseña**: mínimo 8 caracteres en registro.
- **Google**: botón Google en login; primera vez redirige a **Completar tu perfil** (categoría + piloto favoritos).
- **Recuperar contraseña**: en login → «¿Olvidaste la contraseña?» → email con enlace → `/login?tab=new-password`.

## Registro

1. Nombre, email, contraseña.
2. Elegir **categoría favorita** (F1, F2, F3, MotoGP, Moto2, Moto3).
3. Elegir **piloto favorito** de esa categoría (lista cargada desde el API).
4. Si Supabase exige confirmar email, los favoritos se guardan al primer login tras confirmar.

## Favoritos

- Se guardan en el servidor (perfil de usuario).
- Aparecen en la sidebar como «Tus favoritos» con enlace a la home de la categoría o a la ficha del piloto.
- Tras login con Google sin favoritos previos, la app pide completar onboarding.

## Cerrar sesión

Botón al pie del sidebar cuando hay sesión activa.

## Limitaciones

- No hay pantalla pública «editar perfil» para cambiar favoritos después del registro (solo vía nuevo bootstrap interno).
- El asistente de ayuda y el resto de la app funcionan **sin** cuenta; la cuenta personaliza favoritos y nombre mostrado.
