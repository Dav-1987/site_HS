import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewsEditor from './ReviewsEditor.jsx';

const open = () => fireEvent.click(screen.getByRole('button', { name: /Отзывы/ }));

describe('ReviewsEditor — выключатели раздела', () => {
  it('показывает оба переключателя внутри панели отзывов', () => {
    render(<ReviewsEditor reviews={[]} onChange={() => {}} blocks={{}} onBlocksChange={() => {}} />);
    open();
    expect(screen.getByLabelText(/Показывать раздел/)).toBeTruthy();
    expect(screen.getByLabelText(/Лента на главной/)).toBeTruthy();
  });

  it('выключает раздел целиком', () => {
    const onBlocksChange = vi.fn();
    render(
      <ReviewsEditor reviews={[]} onChange={() => {}} blocks={{ reviews: true }} onBlocksChange={onBlocksChange} />,
    );
    open();
    fireEvent.click(screen.getByLabelText(/Показывать раздел/));
    expect(onBlocksChange).toHaveBeenCalledWith(expect.objectContaining({ reviews: false }));
  });

  // Лента не может жить без раздела — иначе владелец «включит» её и не поймёт,
  // почему на главной пусто.
  it('блокирует ленту, когда раздел выключен', () => {
    render(
      <ReviewsEditor reviews={[]} onChange={() => {}} blocks={{ reviews: false }} onBlocksChange={() => {}} />,
    );
    open();
    expect(screen.getByLabelText(/Лента на главной/).disabled).toBe(true);
  });

  it('сообщает в заголовке, что раздел выключен', () => {
    render(
      <ReviewsEditor reviews={[{ image: '/uploads/a.png' }]} onChange={() => {}} blocks={{ reviews: false }} onBlocksChange={() => {}} />,
    );
    expect(screen.getByText('раздел выключен')).toBeTruthy();
  });
});
