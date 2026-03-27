<div className="space-y-6 py-2">

{/* RESET BUTTON */}
<div className="flex justify-end">
  <Button
    variant="ghost"
    className="text-[10px] text-zinc-400 hover:text-white"
    onClick={() => {
      setVisible([...DEFAULT_VISIBLE_COLUMNS]);
      setOrder([...ALL_COLUMN_IDS]);
    }}
  >
    Reset to Defaults
  </Button>
</div>

{/* VISIBILITY TOGGLES */}
<div className="space-y-3">
  <div className="text-[10px] uppercase tracking-widest text-zinc-500">
    Visibility
  </div>

  {ALL_COLUMN_IDS.map((col) => (
    <div key={col} className="flex items-center justify-between py-1">
      <span className="text-xs text-white">{col}</span>
      <Switch
        checked={visible.includes(col)}
        onCheckedChange={(checked) => {
          if (checked) {
            setVisible((v) => [...v, col]);
          } else {
            setVisible((v) => v.filter((c) => c !== col));
          }
        }}
      />
    </div>
  ))}
</div>

{/* REORDER LIST */}
<div className="space-y-3">
  <div className="text-[10px] uppercase tracking-widest text-zinc-500">
    Order
  </div>

  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={(event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }}
  >
    <SortableContext
      items={order}
      strategy={verticalListSortingStrategy}
    >
      <div className="space-y-2">
        {order.map((col) => (
          <SortableItem key={col} id={col} />
        ))}
      </div>
    </SortableContext>
  </DndContext>
</div>
</div>
        <div className="space-y-6 py-2">

        {/* RESET BUTTON */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            className="text-[10px] text-zinc-400 hover:text-white"
            onClick={() => {
              setVisible([...DEFAULT_VISIBLE_COLUMNS]);
              setOrder([...ALL_COLUMN_IDS]);
            }}
          >
            Reset to Defaults
          </Button>
        </div>

        {/* VISIBILITY TOGGLES */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
            Visibility
          </div>

          {ALL_COLUMN_IDS.map((col) => (
            <div key={col} className="flex items-center justify-between py-1">
              <span className="text-xs text-white">{col}</span>
              <Switch
                checked={visible.includes(col)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setVisible((v) => [...v, col]);
                  } else {
                    setVisible((v) => v.filter((c) => c !== col));
                  }
                }}
              />
            </div>
          ))}
        </div>

        {/* REORDER LIST */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
            Order
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event;
              if (!over || active.id === over.id) return;

              setOrder((prev) => {
                const oldIndex = prev.indexOf(active.id as string);
                const newIndex = prev.indexOf(over.id as string);
                return arrayMove(prev, oldIndex, newIndex);
              });
            }}
          >
            <SortableContext
              items={order}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {order.map((col) => (
                  <SortableItem key={col} id={col} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
