// src/components/AdminConfig.jsx
import React, { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { firestore } from '../firebase';

// helper to swap the `order` field of two documents
async function swapOrder(refA, orderA, refB, orderB) {
  await Promise.all([
    updateDoc(refA, { order: orderB }),
    updateDoc(refB, { order: orderA })
  ]);
}

export default function AdminConfig() {
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');

  // Load categories in real time
  useEffect(() => {
    const q = query(
      collection(firestore, 'auditCategories'),
      orderBy('order', 'asc')
    );
    return onSnapshot(q, snap =>
      setCategories(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      )
    );
  }, []);

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await addDoc(collection(firestore, 'auditCategories'), {
      name:  newCatName.trim(),
      order: categories.length
    });
    setNewCatName('');
  };

  const updateCategory = async (catId, newName) => {
    await updateDoc(doc(firestore, 'auditCategories', catId), {
      name: newName
    });
  };

  const deleteCategory = async (catId) => {
    await deleteDoc(doc(firestore, 'auditCategories', catId));
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Audit Configuration</h1>

      {/* Add new category */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="New category name"
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
        />
        <button onClick={addCategory}>Add Category</button>
      </div>

      {/* List categories */}
      {categories.map(cat => (
        <CategoryItem
          key={cat.id}
          category={cat}
          onRename={(name) => updateCategory(cat.id, name)}
          onDelete={() => deleteCategory(cat.id)}
        />
      ))}
    </div>
  );
}

// Renders one category with collapse/expand of its subcategories
function CategoryItem({ category, onRename, onDelete }) {
  const [editName, setEditName]     = useState(category.name);
  const [collapsed, setCollapsed]   = useState(true);
  const [newSubName, setNewSubName] = useState('');
  const [subs, setSubs]             = useState([]);

  useEffect(() => {
    if (collapsed) return;
    const subColl = collection(
      firestore,
      'auditCategories',
      category.id,
      'subcategories'
    );
    const q = query(subColl, orderBy('order', 'asc'));
    return onSnapshot(q, snap =>
      setSubs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [collapsed, category.id]);

  const addSub = async () => {
    if (!newSubName.trim()) return;
    const ref = collection(
      firestore,
      'auditCategories',
      category.id,
      'subcategories'
    );
    await addDoc(ref, {
      name:  newSubName.trim(),
      order: subs.length
    });
    setNewSubName('');
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
      <button onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? '+' : '–'}
      </button>

      <input
        value={editName}
        onChange={e => setEditName(e.target.value)}
        onBlur={() => onRename(editName)}
        style={{ marginLeft: 10 }}
      />
      <button onClick={onDelete} style={{ marginLeft: 10 }}>
        Delete Category
      </button>

      {!collapsed && (
        <div style={{ paddingLeft: 20, marginTop: 10 }}>
          <h4>Subcategories of “{category.name}”</h4>

          <div style={{ marginBottom: 10 }}>
            <input
              placeholder="New subcategory"
              value={newSubName}
              onChange={e => setNewSubName(e.target.value)}
            />
            <button onClick={addSub}>Add</button>
          </div>

          {subs.map(sub => (
            <SubcategoryItem
              key={sub.id}
              categoryId={category.id}
              sub={sub}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Renders one subcategory with collapse/expand of its questions and up/down controls
function SubcategoryItem({ categoryId, sub }) {
  const [editName, setEditName]     = useState(sub.name);
  const [collapsed, setCollapsed]   = useState(true);
  const [qList, setQList]           = useState([]);
  const [newQText, setNewQText]     = useState('');
  const [newQType, setNewQType]     = useState('radio');

  useEffect(() => {
    if (collapsed) return;
    const qColl = collection(
      firestore,
      'auditCategories',
      categoryId,
      'subcategories',
      sub.id,
      'questions'
    );
    const q = query(qColl, orderBy('order', 'asc'));
    return onSnapshot(q, snap =>
      setQList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [collapsed, categoryId, sub.id]);

  const addQuestion = async () => {
    if (!newQText.trim()) return;
    const ref = collection(
      firestore,
      'auditCategories',
      categoryId,
      'subcategories',
      sub.id,
      'questions'
    );
    await addDoc(ref, {
      text:    newQText.trim(),
      type:    newQType,
      options: newQType === 'radio' ? ['Yes', 'No'] : [],
      order:   qList.length
    });
    setNewQText('');
  };

  const renameSub = async () => {
    await updateDoc(
      doc(
        firestore,
        'auditCategories',
        categoryId,
        'subcategories',
        sub.id
      ),
      { name: editName }
    );
  };

  const deleteSub = async () => {
    await deleteDoc(
      doc(
        firestore,
        'auditCategories',
        categoryId,
        'subcategories',
        sub.id
      )
    );
  };

  const moveQuestion = async (index, direction) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= qList.length) return;

    const current = qList[index];
    const other   = qList[target];

    const refA = doc(
      firestore,
      'auditCategories',
      categoryId,
      'subcategories',
      sub.id,
      'questions',
      current.id
    );
    const refB = doc(
      firestore,
      'auditCategories',
      categoryId,
      'subcategories',
      sub.id,
      'questions',
      other.id
    );

    await swapOrder(refA, current.order, refB, other.order);
  };

  return (
    <div style={{ marginTop: 10, padding: 10, border: '1px dashed #aaa' }}>
      <button onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? '+' : '–'}
      </button>

      <input
        value={editName}
        onChange={e => setEditName(e.target.value)}
        onBlur={renameSub}
        style={{ marginLeft: 8 }}
      />
      <button onClick={deleteSub} style={{ marginLeft: 8 }}>
        Delete Subcategory
      </button>

      {!collapsed && (
        <div style={{ marginLeft: 20, marginTop: 10 }}>
          <h5>Questions</h5>

          {/* Add new question */}
          <div style={{ marginBottom: 10 }}>
            <input
              placeholder="Question text"
              value={newQText}
              onChange={e => setNewQText(e.target.value)}
              style={{ width: '60%' }}
            />
            <select
              value={newQType}
              onChange={e => setNewQType(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <option value="radio">Radio</option>
              <option value="number">Number</option>
              <option value="textarea">Textarea</option>
            </select>
            <button onClick={addQuestion} style={{ marginLeft: 8 }}>
              Add Q
            </button>
          </div>

          {qList.map((q, idx) => (
            <div
              key={q.id}
              style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}
            >
              <button
                onClick={() => moveQuestion(idx, 'up')}
                disabled={idx === 0}
              >
                ↑
              </button>
              <button
                onClick={() => moveQuestion(idx, 'down')}
                disabled={idx === qList.length - 1}
                style={{ marginLeft: 4, marginRight: 8 }}
              >
                ↓
              </button>
              <QuestionItem
                categoryId={categoryId}
                subcategoryId={sub.id}
                question={q}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Renders and saves/deletes one question
function QuestionItem({ categoryId, subcategoryId, question }) {
  const [text, setText] = useState(question.text);
  const [type, setType] = useState(question.type);

  const save = async () => {
    await updateDoc(
      doc(
        firestore,
        'auditCategories',
        categoryId,
        'subcategories',
        subcategoryId,
        'questions',
        question.id
      ),
      { text, type }
    );
  };

  const del = async () => {
    await deleteDoc(
      doc(
        firestore,
        'auditCategories',
        categoryId,
        'subcategories',
        subcategoryId,
        'questions',
        question.id
      )
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={save}
        style={{ width: '60%' }}
      />
      <select
        value={type}
        onChange={e => {
          setType(e.target.value);
          save();
        }}
        style={{ marginLeft: 8 }}
      >
        <option value="radio">Radio</option>
        <option value="number">Number</option>
        <option value="textarea">Textarea</option>
      </select>
      <button onClick={del} style={{ marginLeft: 8 }}>
        Delete
      </button>
    </div>
  );
}
