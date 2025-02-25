'use client';

import dynamic from 'next/dynamic';

const ClickerGame = dynamic(
  () => import('../components/ClickerGame'), 
  { loading: () => <div>Loading...</div> }
);

export default function Home() {
  return (
    <main>
      <ClickerGame />
    </main>
  );
}