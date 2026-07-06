import { View, Pressable, ScrollView, Alert } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { Mono } from '@/components/Typography';
import { SectionLabel } from '@/components/SectionLabel';
import { useTheme } from '@/theme';
import type { Photo } from '@/db/types';
import { addPhoto, deletePhoto } from '@/db/queries';
import { persistPhoto, deletePhotoFile } from '@/lib/media';

const THUMB = 88;

export function PhotosBlock({
  dayId,
  photos,
  db,
  onChange,
}: {
  dayId: number;
  photos: Photo[];
  db: SQLiteDatabase;
  onChange: () => void;
}) {
  const { colors, spacing, fontSize, radius } = useTheme();

  const handlePicked = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || result.assets.length === 0) return;
    for (const asset of result.assets) {
      const uri = persistPhoto(asset.uri);
      await addPhoto(db, dayId, uri);
    }
    onChange();
  };

  const fromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach progress pics.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    await handlePicked(result);
  };

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to capture today.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    await handlePicked(result);
  };

  const add = () => {
    Alert.alert('Add photo', undefined, [
      { text: 'Take photo', onPress: fromCamera },
      { text: 'Choose from library', onPress: fromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const remove = (photo: Photo) => {
    Alert.alert('Remove photo', 'Delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePhoto(db, photo.id);
          deletePhotoFile(photo.uri);
          onChange();
        },
      },
    ]);
  };

  return (
    <View style={{ marginBottom: spacing.xxl }}>
      <SectionLabel
        right={
          <Pressable onPress={add} hitSlop={8}>
            <Feather name="plus" size={15} color={colors.mid} />
          </Pressable>
        }
      >
        Photos
      </SectionLabel>

      {photos.length === 0 ? (
        <Pressable onPress={add}>
          <Mono size={fontSize.small} color={colors.muted}>
            + Attach a workout shot or a stats screenshot. Proof you moved.
          </Mono>
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {photos.map((p) => (
            <Pressable key={p.id} onLongPress={() => remove(p)} onPress={() => remove(p)}>
              <Image
                source={{ uri: p.uri }}
                style={{
                  width: THUMB,
                  height: THUMB,
                  borderRadius: radius.md,
                  backgroundColor: colors.surfaceAlt,
                }}
                contentFit="cover"
              />
            </Pressable>
          ))}
          <Pressable
            onPress={add}
            style={{
              width: THUMB,
              height: THUMB,
              borderRadius: radius.md,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.dim,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="plus" size={20} color={colors.muted} />
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
