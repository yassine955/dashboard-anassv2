# Firebase Integration Setup

## Development Setup

Voor development is geen extra configuratie nodig. De applicatie gebruikt de client-side Firebase SDK die automatisch werkt met je Firebase project.

## Production Setup

De applicatie gebruikt de client-side Firebase SDK, dus er is geen extra configuratie nodig voor productie. De Firebase configuratie wordt automatisch geladen vanuit je environment.

## Firebase Project Configuratie

De Firebase configuratie is al ingesteld in `src/lib/firebase.ts` en werkt automatisch. Je hoeft geen extra setup te doen.

## Environment Variables

Voor productie, zorg ervoor dat je Firebase project configuratie correct is ingesteld in je hosting provider.

## Testen

Je kunt testen of de setup werkt door de email functionaliteit te gebruiken in je dashboard. Als je een email probeert te versturen en het werkt, dan is de Firebase integratie correct geconfigureerd.

## Troubleshooting

### Error: "Could not load default credentials"

Dit probleem is opgelost door de client-side Firebase SDK te gebruiken in plaats van de Admin SDK.

### Error: "Permission denied"

- Controleer of je Firebase project correct is ingesteld
- Zorg ervoor dat Firestore rules toegang toestaan voor je applicatie

### Development Issues

- Voor development werkt de applicatie automatisch met je Firebase project
- Zorg ervoor dat je Firebase project configuratie correct is in `src/lib/firebase.ts`
